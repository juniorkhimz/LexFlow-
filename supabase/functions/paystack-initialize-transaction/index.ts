// Initializes a Paystack transaction for the caller's firm to subscribe (or
// change plan). Runs server-side so the Paystack SECRET key never reaches
// the browser — same reasoning as the Stripe version this replaces.
//
// Replaces supabase/functions/create-checkout-session (Stripe). Removed
// rather than kept alongside, because Kenya is not a Stripe-supported
// country (confirmed via research: Stripe requires a US/UK/other-
// supported-country business entity to use from Kenya at all) — this
// isn't "support two providers," it's "the previous provider doesn't work
// for this business," so keeping the old code around would be dead code.
//
// Required secret: PAYSTACK_SECRET_KEY (starts with sk_test_ or sk_live_)
// Deploy: supabase functions deploy paystack-initialize-transaction

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!PAYSTACK_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Billing is not configured for this deployment." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { planCode } = await req.json();
    if (!planCode || typeof planCode !== "string") {
      return new Response(JSON.stringify({ error: "planCode is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Identify the caller from their auth JWT and resolve their firm —
    // never trust a firm_id from the request body, or any firm could
    // start a subscription billed under another firm's identity.
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

    const { data: profile, error: profileError } = await userClient
      .from("profiles")
      .select("firm_id, role, email")
      .eq("id", userData.user.id)
      .single();
    if (profileError || !profile?.firm_id) {
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

    // Paystack doesn't require pre-creating a customer the way Stripe
    // does — passing `email` on transaction/initialize is enough; Paystack
    // resolves or creates the customer record itself. metadata.firm_id is
    // echoed back on the charge.success webhook event reliably (Paystack's
    // documented behavior for transaction-level metadata); it is NOT
    // relied upon for the subscription.create event, which uses a
    // different resolution path — see paystack-webhook's own comments for
    // why that distinction matters.
    const origin = req.headers.get("origin") ?? "http://localhost:3000";
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: profile.email,
        plan: planCode,
        callback_url: `${origin}/settings?checkout=success`,
        metadata: { firm_id: profile.firm_id },
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.status) {
      console.error("Paystack initialize error", response.status, data);
      return new Response(JSON.stringify({ error: data.message ?? "Unable to start checkout with Paystack." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: data.data.authorization_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("paystack-initialize-transaction error", error);
    return new Response(JSON.stringify({ error: "Unable to start checkout" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
