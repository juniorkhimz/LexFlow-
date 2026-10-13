import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Lead, LeadStatus, TablesInsert } from "@/types/database";


export interface LeadFilters {
  search?: string;
  status?: LeadStatus | "all";
  from?: number;
  to?: number;
}

const leadKeys = {
  all: ["leads"] as const,
  list: (filters: LeadFilters) => [...leadKeys.all, "list", filters] as const,
  detail: (id: string) => [...leadKeys.all, "detail", id] as const,
};

export function useLeads(filters: LeadFilters) {
  return useQuery({
    queryKey: leadKeys.list(filters),
    queryFn: async () => {
      let query = supabase.from("leads").select("*", { count: "exact" }).order("created_at", { ascending: false });
      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,company.ilike.%${filters.search}%,email.ilike.%${filters.search}%`,
        );
      }
      if (filters.from != null && filters.to != null) {
        query = query.range(filters.from, filters.to);
      }
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data as Lead[], count };
    },
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: leadKeys.detail(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").eq("id", id as string).single();
      if (error) throw error;
      return data as Lead;
    },
  });
}

export type LeadInput = Pick<
  Lead,
  "name" | "company" | "email" | "phone" | "practice_area_id" | "status" | "advocate_id" | "source" | "priority" | "estimated_value" | "notes"
>;

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<LeadInput>) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("firm_id")
        .eq("id", userData.user?.id ?? "")
        .single();
      if (!profile?.firm_id) throw new Error("No firm associated with this account.");

      const { data, error } = await supabase
        .from("leads")
        .insert({ ...input, firm_id: profile.firm_id, created_by: userData.user?.id } as TablesInsert<"leads">)        .select()
        .single();
      if (error) throw error;

      await supabase.from("activities").insert({
        firm_id: profile.firm_id,
        user_id: userData.user?.id,
        action: "lead.created",
        entity_type: "lead",
        entity_id: data.id,
        metadata: { name: data.name },
      });

      return data as Lead;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: leadKeys.all }),
  });
}

export function useUpdateLead(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<LeadInput>) => {
      const { data, error } = await supabase.from("leads").update(input).eq("id", id).select().single();
      if (error) throw error;

      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("activities").insert({
        firm_id: data.firm_id,
        user_id: userData.user?.id,
        action: "lead.updated",
        entity_type: "lead",
        entity_id: id,
        metadata: {},
      });

      return data as Lead;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.all });
      qc.invalidateQueries({ queryKey: leadKeys.detail(id) });
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: leadKeys.all }),
  });
}

export function useConvertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase.rpc("convert_lead_to_client", { p_lead_id: leadId });
      if (error) throw error;
      return data as string; // new client id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.all });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useLeadActivity(leadId: string | undefined) {
  return useQuery({
    queryKey: ["activities", "lead", leadId],
    enabled: Boolean(leadId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("entity_type", "lead")
        .eq("entity_id", leadId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Simple unpaginated id/name list for <select> dropdowns elsewhere (New
// Appointment "associate lead") — same rationale as useClientOptions.
export function useLeadOptions() {
  return useQuery({
    queryKey: ["leads", "options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("id, name").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });
}
