// Sends the actual invitation email via Resend. Closes the gap flagged in
// README.md's "Known gap" note under Invitations — until now, invite links
// were only ever shown in the UI for the admin to copy/paste manually.
//
// Security model: the invitation is re-read here using the CALLER's own
// JWT (not the service role), so Postgres RLS decides whether they're
// allowed to see it at all — "admins manage own firm invitations" in
// 0009_invitations.sql means this function can only ever send an email for
// an invitation belonging to the caller's own firm, where the caller is
// admin/partner. No firm_id or invitation contents are trusted from the
// request body beyond the invitation's own id.
//
// Required secret: RESEND_API_KEY (get one free at resend.com)
// Optional secrets:
//   INVITE_FROM_EMAIL — defaults to Resend's shared test sender below.
//     IMPORTANT: Resend's shared "onboarding@resend.dev" sender can only
//     deliver to the email address on your OWN Resend account while
//     unverified. To actually email real invitees, verify a sending domain
//     in the Resend dashboard and set this to an address on that domain
//     (e.g. "LexFlow <invites@yourfirmdomain.com>").
//   APP_URL — fallback base URL for the invite link if the request has no
//     Origin header (e.g. called from a server context). Defaults to the
//     request's own Origin when present.
//
// Deploy: supabase functions deploy send-invitation-email

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("INVITE_FROM_EMAIL") || "LexFlow <onboarding@resend.dev>";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Email sending is not configured for this deployment." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invitationId } = await req.json();
    if (!invitationId || typeof invitationId !== "string") {
      return new Response(JSON.stringify({ error: "invitationId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // RLS-scoped read via the CALLER's own client — this is what actually
    // enforces "you can only email invitations for your own firm", not any
    // check written in this function's own logic.
    const { data: invitation, error: invError } = await userClient
      .from("invitations")
      .select("email, role, token, status, firms(name)")
      .eq("id", invitationId)
      .single();

    if (invError || !invitation) {
      return new Response(JSON.stringify({ error: "Invitation not found or not authorized." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (invitation.status !== "pending") {
      return new Response(JSON.stringify({ error: "This invitation is no longer pending." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || Deno.env.get("APP_URL") || "http://localhost:3000";
    const inviteUrl = `${origin}/invite/${invitation.token}`;
    const firmName = (invitation.firms as unknown as { name: string } | null)?.name ?? "your firm";
    const roleLabel = String(invitation.role).replace(/_/g, " ");

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [invitation.email],
        subject: `You've been invited to join ${firmName} on LexFlow`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <p>Hi,</p>
            <p><strong>${firmName}</strong> has invited you to join their LexFlow workspace as <strong>${roleLabel}</strong>.</p>
            <p style="margin: 24px 0;">
              <a href="${inviteUrl}" style="background:#141b2b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
                Accept invitation
              </a>
            </p>
            <p style="color:#666;font-size:13px;">This link expires in 7 days. If you weren't expecting this, you can safely ignore this email.</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Resend API error", emailRes.status, errText);
      return new Response(JSON.stringify({ error: "Failed to send email via Resend." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-invitation-email error", error);
    return new Response(JSON.stringify({ error: "Something went wrong." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
