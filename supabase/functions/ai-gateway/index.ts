// Single enforcement point for any AI request that needs FIRM DATA —
// matter context, document context, or firm-level aggregate metrics — as
// opposed to gemini-chat, which is a general-purpose assistant with no
// data access at all and stays that way.
//
// ══════════════════════════════════════════════════════════════════════
// THE CORE SAFETY GUARANTEE OF THIS FILE:
// There is no function in this codebase, right now, that fetches real
// matter content, real document content, or real firm metrics and sends
// them to Gemini. Not "disabled by a flag" — literally not written.
// getLiveMatterContext(), getLiveDocumentContext(), and
// getLiveFirmMetrics() below are stubs that throw. This is deliberate: a
// flag can be flipped by mistake or by someone who doesn't understand what
// it does; code that doesn't exist cannot leak privileged data by
// accident. This applies equally to firm-level aggregate metrics (revenue
// totals, lead counts) as it does to matter/document content — even
// though aggregates are a lower sensitivity class than privileged case
// material, the same conservative default is kept for all of it rather
// than this file unilaterally deciding one category is "safe enough" on
// its own judgment. See the README's "AI Gateway" section for what
// actually implementing live mode would require for each category.
// ══════════════════════════════════════════════════════════════════════
//
// Required secret (optional — defaults to the safest value if unset):
//   AI_MATTER_CONTEXT_MODE = "disabled" (default) | "synthetic"
//   ("live" is intentionally not a valid value yet — see above.)
// Also requires GEMINI_API_KEY (shared with gemini-chat) when mode is
// "synthetic" — no Gemini call happens at all in "disabled" mode.
//
// Deploy: supabase functions deploy ai-gateway

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-flash-latest";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const MODE = Deno.env.get("AI_MATTER_CONTEXT_MODE") || "disabled";

type RequestType = "matter_summary" | "ask_matter" | "document_summary" | "firm_insights";

interface GatewayRequest {
  requestType: RequestType;
  matterId?: string;    // required for matter_summary / ask_matter
  documentId?: string;  // required for document_summary
  question?: string;    // required for ask_matter
}

// Fixed, clearly-fake context blocks used only in "synthetic" mode. Each
// mirrors the field list from the product brief these features came from,
// so the demo shows the full intended shape of each feature — just never
// with anything real behind it.

const SYNTHETIC_MATTER_CONTEXT = `
Matter: Simba Holdings Ltd v. Coastal Traders EA (SAMPLE DATA)
Practice area: Commercial Litigation
Status: Active
Parties: Simba Holdings Ltd (Claimant), Coastal Traders EA Ltd (Respondent)
Key facts: Dispute over a supply contract for construction materials, breach
alleged for late delivery causing project delays. Claimant seeks damages of
KES 4,200,000 plus costs.
Important dates: Contract signed 3 Feb 2026. Breach alleged 14 May 2026.
Demand letter sent 2 Jun 2026. Suit filed 20 Jun 2026.
Outstanding documents: Signed delivery logs from Respondent (requested,
not yet received). Expert quantum report (in progress).
Latest correspondence: Respondent's advocate requested a 14-day extension
to file their defence, granted on 18 Aug 2026.
Open tasks: Draft witness statement (due in 5 days). Follow up on delivery
logs (overdue).
Upcoming deadlines: Defence due in 9 days. Case management conference in 3 weeks.
Financial position: KES 180,000 billed to date, KES 95,000 paid, KES 85,000 outstanding.
`.trim();

const SYNTHETIC_DOCUMENT_CONTEXT = `
Document: Commercial Supply Agreement (SAMPLE DATA — 48 pages, fictional)
Parties: 4 (Simba Holdings Ltd, Coastal Traders EA Ltd, and two guarantors)
Effective date: 12 Aug 2026
Renewal term: Automatic annual renewal on 12 Aug 2027 unless terminated
Termination notice period: 30 days written notice
Key obligations: Monthly delivery schedule, quality inspection rights,
late-delivery penalty clause (2% per week), exclusive supply arrangement,
confidentiality clause, dispute resolution via arbitration in Nairobi.
Potential issues noted: Penalty clause caps total penalties at 15% of
contract value (may be lower than client's expected exposure). Arbitration
clause does not specify a named arbitration body. Termination clause is
one-sided (only benefits the supplier).
`.trim();

const SYNTHETIC_FIRM_METRICS = `
Firm performance summary (SAMPLE DATA — fictional numbers):
Revenue this month: KES 4,820,000 (up from KES 4,100,000 last month)
Collected: KES 3,910,000. Outstanding: KES 910,000.
Active matters: 184. New clients this month: 31.
Lead conversion rate: 32% (18 of 56 leads converted).
Top practice area by revenue: Commercial Litigation (42% of billed revenue).
Top revenue-generating advocate: J. Mwangi.
Matters with no activity in 14+ days: 7.
Leads with no follow-up recorded: 5.
`.trim();

async function callGemini(prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
      }),
    },
  );
  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini API error in ai-gateway", response.status, errText);
    throw new Error("AI service is temporarily unavailable.");
  }
  const data = await response.json();
  return (
    data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ??
    "I couldn't generate a response — please try rephrasing."
  );
}

// Intentionally unimplemented — see the safety guarantee comment at the
// top of this file. Each throws rather than silently falling back to
// synthetic data, so a future caller can never mistake a "live" request
// for one that actually used real data.
function getLiveMatterContext(_matterId: string): never {
  throw new Error("Live matter-data AI context is not implemented — see this file's top comment.");
}
function getLiveDocumentContext(_documentId: string): never {
  throw new Error("Live document-data AI context is not implemented — see this file's top comment.");
}
function getLiveFirmMetrics(_firmId: string): never {
  throw new Error("Live firm-metrics AI context is not implemented — see this file's top comment.");
}
// Referenced (never called) to make the "exists but unused" guarantee
// explicit and lint-visible rather than looking like accidental dead code.
void getLiveMatterContext;
void getLiveDocumentContext;
void getLiveFirmMetrics;

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

    const { requestType, matterId, documentId, question } = (await req.json()) as GatewayRequest;
    if (!requestType) {
      return new Response(JSON.stringify({ error: "requestType is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await userClient.from("profiles").select("firm_id").eq("id", userData.user.id).single();
    if (!profile?.firm_id) {
      return new Response(JSON.stringify({ error: "No firm associated with this account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══ AUTHORIZATION CHECK — branches by request type, but always runs,
    // in every mode, via a real RLS-scoped query using the CALLER's own
    // client (never service role). ═══
    let entityType: string;
    let entityId: string;

    if (requestType === "matter_summary" || requestType === "ask_matter") {
      if (!matterId) {
        return new Response(JSON.stringify({ error: "matterId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: matter, error: matterError } = await userClient
        .from("matters").select("id").eq("id", matterId).single();
      if (matterError || !matter) {
        return new Response(JSON.stringify({ error: "Matter not found or you don't have access to it." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      entityType = "matter";
      entityId = matterId;
    } else if (requestType === "document_summary") {
      if (!documentId) {
        return new Response(JSON.stringify({ error: "documentId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: doc, error: docError } = await userClient
        .from("documents").select("id").eq("id", documentId).single();
      if (docError || !doc) {
        return new Response(JSON.stringify({ error: "Document not found or you don't have access to it." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      entityType = "document";
      entityId = documentId;
    } else if (requestType === "firm_insights") {
      // No specific record to check — every authenticated staff member of
      // a firm is implicitly authorized to see their OWN firm's aggregate
      // metrics (this mirrors the Reports page, which any staff role can
      // already view). profile.firm_id resolution above IS the check.
      entityType = "firm";
      entityId = profile.firm_id;
    } else {
      return new Response(JSON.stringify({ error: `Unknown requestType: "${requestType}"` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await userClient.from("activities").insert({
      firm_id: profile.firm_id,
      user_id: userData.user.id,
      action: `ai.${requestType}`,
      entity_type: entityType,
      entity_id: entityId,
      metadata: { mode: MODE },
    });

    if (MODE === "disabled") {
      return new Response(
        JSON.stringify({ enabled: false, message: "AI insights aren't enabled for this deployment yet." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (MODE !== "synthetic") {
      return new Response(JSON.stringify({ error: `Unsupported AI_MATTER_CONTEXT_MODE: "${MODE}"` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI is not configured for this deployment." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let prompt: string;
    if (requestType === "matter_summary") {
      prompt = `You are a legal matter assistant. Here is the matter context:\n\n${SYNTHETIC_MATTER_CONTEXT}\n\nSummarize this matter's current status and what's outstanding, in 4-6 sentences.`;
    } else if (requestType === "ask_matter") {
      prompt = `You are a legal matter assistant. Here is the matter context:\n\n${SYNTHETIC_MATTER_CONTEXT}\n\nAnswer this question about the matter: ${question ?? "Give a general update."}`;
    } else if (requestType === "document_summary") {
      prompt = `You are a legal document analyst. Here is a document's extracted content:\n\n${SYNTHETIC_DOCUMENT_CONTEXT}\n\nProvide a short structured analysis: parties, key dates, key obligations, and any potential issues to flag, in a few short bullet points.`;
    } else {
      prompt = `You are a law firm performance analyst. Here are this firm's current metrics:\n\n${SYNTHETIC_FIRM_METRICS}\n\nGive 3 short, specific insight sentences a managing partner would find useful — the kind that says "X matters have had no activity" or "practice area Y generated Z% of revenue," not generic advice.`;
    }

    const text = await callGemini(prompt);

    return new Response(
      JSON.stringify({
        enabled: true,
        mode: "synthetic",
        text,
        disclaimer: "This response was generated using SAMPLE data for demonstration — not your firm's real data.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("ai-gateway error", error);
    return new Response(JSON.stringify({ error: "Something went wrong." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
