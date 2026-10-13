import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface AiGatewayResponse {
  enabled: boolean;
  mode?: "synthetic";
  text?: string;
  message?: string;
  disclaimer?: string;
}

interface GatewayInput {
  requestType: "matter_summary" | "ask_matter" | "document_summary" | "firm_insights";
  matterId?: string;
  documentId?: string;
  question?: string;
}

async function invokeGateway(input: GatewayInput): Promise<AiGatewayResponse> {
  const { data, error } = await supabase.functions.invoke<AiGatewayResponse & { error?: string }>(
    "ai-gateway",
    { body: input },
  );
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data) throw new Error("No response from AI gateway.");
  return data;
}

// Calls the ai-gateway Edge Function — see that function's own top-of-file
// comment for the full safety model. Every hook here is deliberately thin:
// none of them know about "modes" beyond passing through whatever the
// gateway returns, so the UI (the AI Assistant tab in matter-detail.tsx,
// the Command Center dashboard) is what's responsible for rendering the
// disclaimer prominently, not silently trusting that a response is real.

// Kept as its own named hook (rather than folded into a single generic
// one) because it's already wired into matter-detail.tsx with this exact
// signature — narrowing it here would be an unnecessary breaking change to
// working code.
export function useMatterAiRequest() {
  return useMutation({
    mutationFn: (input: { matterId: string; requestType: "matter_summary" | "ask_matter"; question?: string }) =>
      invokeGateway(input),
  });
}

export function useDocumentAiSummary() {
  return useMutation({
    mutationFn: (documentId: string) => invokeGateway({ requestType: "document_summary", documentId }),
  });
}

export function useFirmInsights() {
  return useMutation({
    mutationFn: () => invokeGateway({ requestType: "firm_insights" }),
  });
}
