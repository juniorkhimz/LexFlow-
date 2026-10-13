import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { MessageRow } from "@/types/database";

export function useConversations() {
  // A lightweight "conversation list": distinct clients/matters that have
  // at least one message, most recent first.
  return useQuery({
    queryKey: ["messages", "conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, client_id, matter_id, body, created_at, clients(full_name), matters(matter_name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const seen = new Set<string>();
      const conversations: { key: string; label: string; clientId: string | null; matterId: string | null; lastMessage: string; lastAt: string }[] = [];
      for (const row of data as unknown as {
        client_id: string | null; matter_id: string | null; body: string; created_at: string;
        clients: { full_name: string } | null; matters: { matter_name: string } | null;
      }[]) {
        const key = row.client_id ?? row.matter_id ?? "";
        if (!key || seen.has(key)) continue;
        seen.add(key);
        conversations.push({
          key,
          label: row.clients?.full_name ?? row.matters?.matter_name ?? "Unknown",
          clientId: row.client_id,
          matterId: row.matter_id,
          lastMessage: row.body,
          lastAt: row.created_at,
        });
      }
      return conversations;
    },
  });
}

export function useThreadMessages(clientId: string | null, matterId: string | null) {
  return useQuery({
    queryKey: ["messages", "thread", clientId, matterId],
    enabled: Boolean(clientId || matterId),
    queryFn: async () => {
      let query = supabase.from("messages").select("*, profiles(full_name)").order("created_at", { ascending: true });
      query = clientId ? query.eq("client_id", clientId) : query.eq("matter_id", matterId as string);
      const { data, error } = await query;
      if (error) throw error;
      return data as (MessageRow & { profiles: { full_name: string } | null })[];
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { body: string; clientId?: string | null; matterId?: string | null }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in.");
      const { data: profile } = await supabase.from("profiles").select("firm_id").eq("id", userData.user?.id ?? "").single();
      if (!profile?.firm_id) throw new Error("No firm associated with this account.");
      const { data, error } = await supabase
        .from("messages")
        .insert({
          firm_id: profile.firm_id,
          client_id: input.clientId ?? null,
          matter_id: input.matterId ?? null,
          sender_id: userData.user.id,
          body: input.body,
        })
        .select()
        .single();
      if (error) throw error;
      return data as MessageRow;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["messages", "thread", vars.clientId ?? null, vars.matterId ?? null] });
      qc.invalidateQueries({ queryKey: ["messages", "conversations"] });
    },
  });
}
