import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { TrustTransaction, TrustTransactionType } from "@/types/database";

// One row per client with a nonzero-or-active trust history, plus their
// current running balance (computed server-side by client_trust_balance()
// — see 0012_trust_accounting.sql — never summed client-side, so the
// number shown always matches what the compliance-critical
// enforce_trust_balance_nonnegative() trigger would check).
export function useTrustBalances() {
  return useQuery({
    queryKey: ["trust-accounts", "balances"],
    queryFn: async () => {
      const { data: clients, error } = await supabase
        .from("clients")
        .select("id, full_name, organization")
        .order("full_name");
      if (error) throw error;

      const balances = await Promise.all(
        clients.map(async (c) => {
          const { data: balance, error: balError } = await supabase.rpc("client_trust_balance", { p_client_id: c.id });
          if (balError) throw balError;
          return { ...c, balance: (balance as number) ?? 0 };
        }),
      );
      // Only show clients with a nonzero balance or any trust history —
      // most clients never have trust funds at all, no reason to list them.
      return balances.filter((b) => b.balance !== 0);
    },
  });
}

export function useClientTrustBalance(clientId: string | undefined) {
  return useQuery({
    queryKey: ["trust-accounts", "balance", clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("client_trust_balance", { p_client_id: clientId as string });
      if (error) throw error;
      return (data as number) ?? 0;
    },
  });
}

export function useTrustTransactions(clientId: string | undefined) {
  return useQuery({
    queryKey: ["trust-accounts", "transactions", clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trust_transactions")
        .select("*, matters(matter_name)")
        .eq("client_id", clientId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (TrustTransaction & { matters: { matter_name: string } | null })[];
    },
  });
}

export function useRecordTrustTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      clientId: string; matterId?: string | null; type: TrustTransactionType;
      amount: number; description?: string; reference?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("firm_id").eq("id", userData.user?.id ?? "").single();
      if (!profile?.firm_id) throw new Error("No firm associated with this account.");

      // The database trigger (enforce_trust_balance_nonnegative) is the
      // real enforcement — this insert will fail with a clear Postgres
      // error if it would overdraw the client's trust balance. No
      // client-side balance math is trusted as the source of truth.
      const { data, error } = await supabase
        .from("trust_transactions")
        .insert({
          firm_id: profile.firm_id,
          client_id: input.clientId,
          matter_id: input.matterId ?? null,
          type: input.type,
          amount: input.amount,
          description: input.description ?? null,
          reference: input.reference ?? null,
          recorded_by: userData.user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("activities").insert({
        firm_id: profile.firm_id,
        user_id: userData.user?.id,
        action: `trust.${input.type}`,
        entity_type: "trust_transaction",
        entity_id: data.id,
        metadata: { amount: input.amount },
      });

      return data as TrustTransaction;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["trust-accounts"] });
      qc.invalidateQueries({ queryKey: ["trust-accounts", "balance", vars.clientId] });
      qc.invalidateQueries({ queryKey: ["trust-accounts", "transactions", vars.clientId] });
    },
  });
}
