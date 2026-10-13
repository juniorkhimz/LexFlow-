import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Subscription } from "@/types/database";

// Reads directly from the table — safe because the RLS policy in
// 0008_subscriptions.sql already restricts this to the caller's own firm
// (admins/partners only). No Edge Function needed for reads, only writes.
export function useSubscription() {
  return useQuery({
    queryKey: ["billing", "subscription"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("firm_id").eq("id", userData.user?.id ?? "").single();
      if (!profile?.firm_id) return null;
      const { data, error } = await supabase.from("subscriptions").select("*").eq("firm_id", profile.firm_id).maybeSingle();
      if (error) throw error;
      return data as Subscription | null;
    },
  });
}

export function useStartCheckout() {
  return useMutation({
    mutationFn: async (planCode: string) => {
      const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
        "paystack-initialize-transaction",
        { body: { planCode } },
      );
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error ?? "No checkout URL returned");
      return data.url;
    },
  });
}

// Replaces useOpenBillingPortal (Stripe). Paystack has no hosted
// self-service portal to redirect to — this calls a direct
// cancel-subscription Edge Function instead. See that function's own
// comment for the reasoning; this is a genuine capability difference
// from Stripe, not a same-shape rename.
export function useCancelSubscription() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<{ cancelled?: boolean; error?: string }>(
        "paystack-cancel-subscription",
        { body: {} },
      );
      if (error) throw error;
      if (!data?.cancelled) throw new Error(data?.error ?? "Unable to cancel subscription");
      return true;
    },
  });
}
