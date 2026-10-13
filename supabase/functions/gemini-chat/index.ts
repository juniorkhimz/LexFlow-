// Proxies chat messages to Google's Gemini API. Runs server-side so the
// Gemini API key never reaches the browser.
//
// DESIGN DECISION — this assistant does NOT have access to firm data
// (leads, clients, matters, documents, etc.). It's a general-purpose
// assistant only. Wiring it to query the firm's own Supabase data would be
// a genuinely useful next step, but it needs careful design first: which
// tables are safe to summarize into a prompt, how to keep that summary
// scoped to the caller's own firm (still authenticated + firm_id-checked
// the same way every other function here is), and — for a legal practice
// tool specifically — client confidentiality implications of sending case
// data to a third-party model at all. Left out deliberately rather than
// built carelessly.
//
// Required secret: GEMINI_API_KEY
// Optional secret: GEMINI_MODEL (defaults below). Google's model lineup
// moves fast — "gemini-flash-latest" is Google's own alias that always
// points at their current recommended Flash model, which is why it's the
// default here. If you ever get a 404 "model not found", check
// https://ai.google.dev/gemini-api/docs/models for the current model list
// and set GEMINI_MODEL to a specific version instead of the alias.
//
// Deploy: supabase functions deploy gemini-chat

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-flash-latest";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

const SYSTEM_INSTRUCTION =
  "You are the in-app assistant for LexFlow, a legal practice management platform. " +
  "You help staff at a law firm with general questions about using the software, " +
  "drafting suggestions, and general (non-jurisdiction-specific) legal-process questions. " +
  "You do not have access to this firm's actual case data, client records, or documents — " +
  "if asked about specific matters, say so and suggest they check the relevant module. " +
  "You are not a substitute for professional legal judgment; make that clear for anything " +
  "resembling legal advice. Keep answers concise.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI chat is not configured for this deployment." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Require a real authenticated LexFlow session — this endpoint costs
    // money per call, so it must not be reachable by anyone off the internet.
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

    const { messages } = (await req.json()) as { messages: ChatMessage[] };
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Basic guardrails: cap history length and message size sent upstream.
    const trimmed = messages.slice(-20).map((m) => ({ ...m, text: m.text.slice(0, 4000) }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: trimmed.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
          generationConfig: { maxOutputTokens: 1024, temperature: 0.4 },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error", response.status, errText);
      return new Response(JSON.stringify({ error: "AI service is temporarily unavailable." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text: string =
      data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ??
      "I couldn't generate a response — please try rephrasing.";

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("gemini-chat error", error);
    return new Response(JSON.stringify({ error: "Something went wrong." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
