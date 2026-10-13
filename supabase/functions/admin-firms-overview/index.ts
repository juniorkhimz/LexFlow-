// The ONLY place in this codebase that reads across every firm at once.
// Every other query anywhere in the app is firm-scoped by RLS; this
// function deliberately bypasses that using the service-role key, which is
// exactly why it re-verifies platform-admin status itself rather than
// trusting the frontend's route guard (src/router.tsx's requirePlatformAdmin)
// to have already checked — a route guard is a UX convenience, this
// server-side check is the actual security boundary.
//
// No secrets beyond the standard Supabase-injected ones are needed — this
// doesn't call Stripe or any other external API, just Postgres via the
// service-role client.
//
// Deploy: supabase functions deploy admin-firms-overview

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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

    // is_platform_admin() only ever tells the caller about THEMSELVES
    // (see 0013_platform_admins.sql) — calling it via userClient is safe
    // and correctly scoped, unlike the actual data fetch below.
    const { data: isAdmin, error: adminCheckError } = await userClient.rpc("is_platform_admin");
    if (adminCheckError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const [{ data: firms, error: firmsError }, { data: subscriptions }, { data: profiles }] = await Promise.all([
      adminClient.from("firms").select("id, name, created_at, currency").order("created_at", { ascending: false }),
      adminClient.from("subscriptions").select("firm_id, plan, status, current_period_end"),
      adminClient.from("profiles").select("firm_id, role"),
    ]);
    if (firmsError) throw firmsError;

    const subsByFirm = new Map((subscriptions ?? []).map((s) => [s.firm_id, s]));
    const staffCountByFirm = new Map<string, number>();
    for (const p of profiles ?? []) {
      if (p.role !== "client" && p.firm_id) {
        staffCountByFirm.set(p.firm_id, (staffCountByFirm.get(p.firm_id) ?? 0) + 1);
      }
    }

    const overview = (firms ?? []).map((f) => {
      const sub = subsByFirm.get(f.id);
      return {
        id: f.id,
        name: f.name,
        createdAt: f.created_at,
        currency: f.currency,
        plan: sub?.status === "active" ? sub.plan : "free",
        subscriptionStatus: sub?.status ?? "inactive",
        currentPeriodEnd: sub?.current_period_end ?? null,
        staffCount: staffCountByFirm.get(f.id) ?? 0,
      };
    });

    return new Response(JSON.stringify({ firms: overview }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("admin-firms-overview error", error);
    return new Response(JSON.stringify({ error: "Something went wrong." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
