// Cancels the caller's firm's subscription directly via the Paystack API.
// Replaces supabase/functions/create-portal-session (Stripe) — Paystack
// has no hosted self-service billing portal equivalent to Stripe's, so
// rather than fake one, this is a direct in-app action instead. This is a
// real, smaller capability than what Stripe offered (no self-service
// payment-method update, no invoice history view) — documented honestly
// in README.md rather than presented as full parity.
//
// Required secret: PAYSTACK_SECRET_KEY
// Deploy: supabase functions deploy paystack-cancel-subscription

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    const { data: profile } = await userClient
      .from("profiles")
      .select("firm_id, role")
      .eq("id", userData.user.id)
      .single();
    if (!profile?.firm_id) {
      return new Response(JSON.stringify({ error: "No firm associated with this account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (profile.role !== "admin" && profile.role !== "partner") {
      return new Response(JSON.stringify({ error: "Only firm admins can manage billing" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // RLS-scoped read via the caller's OWN client — "admins select own
    // firm subscription" (0008_subscriptions.sql) is what actually
    // guarantees this can only ever read the caller's own firm's row.
    const { data: subscription, error: subError } = await userClient
      .from("subscriptions")
      .select("paystack_subscription_code, paystack_email_token")
      .eq("firm_id", profile.firm_id)
      .maybeSingle();

    if (subError || !subscription?.paystack_subscription_code || !subscription.paystack_email_token) {
      return new Response(JSON.stringify({ error: "No active subscription found to cancel." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.paystack.co/subscription/disable", {
      method: "POST",
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        code: subscription.paystack_subscription_code,
        token: subscription.paystack_email_token,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.status) {
      console.error("Paystack disable error", response.status, data);
      return new Response(JSON.stringify({ error: data.message ?? "Unable to cancel subscription with Paystack." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optimistic update — the paystack-webhook's subscription.disable
    // handler is still the eventual source of truth and will reconcile
    // this shortly after Paystack processes the cancellation.
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    await adminClient.from("subscriptions").update({ cancel_at_period_end: true }).eq("firm_id", profile.firm_id);

    return new Response(JSON.stringify({ cancelled: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("paystack-cancel-subscription error", error);
    return new Response(JSON.stringify({ error: "Unable to cancel subscription" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
