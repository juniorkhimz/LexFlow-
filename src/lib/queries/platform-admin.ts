import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface FirmOverview {
  id: string;
  name: string;
  createdAt: string;
  currency: string;
  plan: string;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  staffCount: number;
}

export function useIsPlatformAdmin() {
  return useQuery({
    queryKey: ["platform-admin", "is-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_platform_admin");
      if (error) throw error;
      return Boolean(data);
    },
  });
}

// The only place in the frontend that ever sees data across every firm —
// backed entirely by the admin-firms-overview Edge Function, which is the
// only place in the BACKEND that does the same (see that function's own
// comment for why this isn't done via a regular RLS-scoped query).
export function useFirmsOverview() {
  return useQuery({
    queryKey: ["platform-admin", "firms-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<{ firms?: FirmOverview[]; error?: string }>(
        "admin-firms-overview",
        { body: {} },
      );
      if (error) throw error;
      if (!data?.firms) throw new Error(data?.error ?? "No data returned");
      return data.firms;
    },
  });
}
