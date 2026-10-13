import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

// Calls the gemini-chat Edge Function — supabase.functions.invoke
// automatically forwards the caller's auth token, which the function
// requires (see supabase/functions/gemini-chat/index.ts). The Gemini API
// key itself never exists in this bundle.
export function useSendChatMessage() {
  return useMutation({
    mutationFn: async (messages: ChatMessage[]) => {
      const { data, error } = await supabase.functions.invoke<{ text?: string; error?: string }>("gemini-chat", {
        body: { messages },
      });
      if (error) throw error;
      if (!data?.text) throw new Error(data?.error ?? "No response from assistant");
      return data.text;
    },
  });
}
