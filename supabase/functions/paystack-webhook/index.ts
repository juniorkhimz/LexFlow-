// Receives Paystack webhook events and is the ONLY writer of the
// `subscriptions` table (same architectural rule as the Stripe webhook it
// replaces — see 0008_subscriptions.sql's RLS policy, which grants no
// client role write access to this table at all).
//
// PUBLIC endpoint (no Supabase auth header — Paystack can't send one). Its
// security is the HMAC-SHA512 signature check below, which is mandatory:
// without it, anyone who found this URL could POST fake "subscription
// active" events. Never remove the signature verification.
//
// FIRM RESOLUTION — an honest note on an API uncertainty, not an assumed
// fact: Paystack reliably echoes `metadata` on the `charge.success` event
// (this is documented, stable behavior for Paystack's core transaction
// object). It is NOT confirmed with the same certainty that `metadata`
// propagates onto the separate `subscription.create` event object, which
// has a different shape. Rather than assume it does and silently fail if
// it doesn't, this handler:
//   1. Resolves firm_id from metadata on charge.success (reliable), and
//      stores paystack_customer_code against that firm immediately.
//   2. On subscription.create, resolves the firm by matching
//      paystack_customer_code against what was stored in step 1 — not by
//      trusting metadata on the subscription event itself.
//   3. Falls back to matching the customer's email against `profiles.email`
//      (an admin/partner's own login email) if step 2 finds no match —
//      covers the case where events arrive out of order.
// Verify this against Paystack's current webhook payload docs during your
// own testing; this is the most likely spot for a real integration bug if
// Paystack's payload shapes differ from what's assumed here.
//
// Required secret: PAYSTACK_SECRET_KEY
// Deploy: supabase functions deploy paystack-webhook --no-verify-jwt
// (Paystack's request carries their own signature, not a Supabase JWT —
// Supabase would otherwise reject it at the platform level before this
// code even runs.)
//
// After deploying, register the endpoint URL in the Paystack Dashboard
// (Settings → API Keys & Webhooks → Webhook URL).

import { createClient } from "npm:@supabase/supabase-js@2";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const adminClient = createClient(supabaseUrl, serviceRoleKey);

function planFromPlanCode(planCode: string | undefined): string {
  // Map your actual Paystack Plan codes to LexFlow plan names here,
  // matching src/lib/billing-plans.ts on the frontend.
  const map: Record<string, string> = {
    // "PLN_xxxxxxxxxxxxxxx": "starter",
    // "PLN_yyyyyyyyyyyyyyy": "pro",
    // "PLN_zzzzzzzzzzzzzzz": "enterprise",
  };
  return (planCode && map[planCode]) || "free";
}

async function verifySignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!signatureHeader) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(PAYSTACK_SECRET_KEY),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computedHex = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computedHex === signatureHeader;
}

async function resolveFirmIdByEmail(email: string | undefined): Promise<string | null> {
  if (!email) return null;
  const { data } = await adminClient.from("profiles").select("firm_id").eq("email", email).maybeSingle();
  return data?.firm_id ?? null;
}

Deno.serve(async (req) => {
  const signatureHeader = req.headers.get("x-paystack-signature");
  const rawBody = await req.text();

  const valid = await verifySignature(rawBody, signatureHeader);
  if (!valid) {
    console.error("Paystack webhook signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(rawBody);

  try {
    switch (event.event) {
      case "charge.success": {
        const data = event.data;
        const firmId: string | undefined = data.metadata?.firm_id;
        const customerCode: string | undefined = data.customer?.customer_code;
        if (firmId && customerCode) {
          await adminClient.from("subscriptions").upsert(
            { firm_id: firmId, paystack_customer_code: customerCode, status: "active" },
            { onConflict: "firm_id" },
          );
        }
        break;
      }

      case "subscription.create": {
        const data = event.data;
        const customerCode: string | undefined = data.customer?.customer_code;
        const email: string | undefined = data.customer?.email;

        let firmId: string | null = null;
        if (customerCode) {
          const { data: existing } = await adminClient
            .from("subscriptions")
            .select("firm_id")
            .eq("paystack_customer_code", customerCode)
            .maybeSingle();
          firmId = existing?.firm_id ?? null;
        }
        if (!firmId) firmId = await resolveFirmIdByEmail(email);

        if (!firmId) {
          console.error("subscription.create: could not resolve firm_id", { customerCode, email });
          break;
        }

        await adminClient.from("subscriptions").upsert(
          {
            firm_id: firmId,
            paystack_customer_code: customerCode ?? null,
            paystack_subscription_code: data.subscription_code,
            paystack_email_token: data.email_token,
            plan: planFromPlanCode(data.plan?.plan_code),
            status: data.status ?? "active",
            current_period_end: data.next_payment_date ?? null,
            cancel_at_period_end: false,
          },
          { onConflict: "firm_id" },
        );
        break;
      }

      case "subscription.disable":
      case "subscription.not_renew": {
        const data = event.data;
        const subscriptionCode: string | undefined = data.subscription_code;
        if (!subscriptionCode) break;

        const { error } = await adminClient
          .from("subscriptions")
          .update({
            status: event.event === "subscription.disable" ? "cancelled" : "non-renewing",
            plan: event.event === "subscription.disable" ? "free" : undefined,
            cancel_at_period_end: event.event === "subscription.not_renew",
          })
          .eq("paystack_subscription_code", subscriptionCode);
        if (error) console.error("Failed to update subscription on disable/not_renew", error);
        break;
      }

      default:
        // Unhandled event types are fine to ignore — Paystack sends many
        // (invoice.create, invoice.update, etc.) not needed for the plan/
        // seat-limit gating this app actually does with subscription state.
        break;
    }

    return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("paystack-webhook handler error", error);
    return new Response(JSON.stringify({ error: "Webhook handler failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
