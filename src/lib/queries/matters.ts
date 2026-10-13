import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Matter, MatterStatus, TablesInsert } from "@/types/database";
export interface MatterFilters {
  search?: string;
  status?: MatterStatus | "all";
  from?: number;
  to?: number;
}

const matterKeys = {
  all: ["matters"] as const,
  list: (filters: MatterFilters) => [...matterKeys.all, "list", filters] as const,
  detail: (id: string) => [...matterKeys.all, "detail", id] as const,
};

export function useMatters(filters: MatterFilters) {
  return useQuery({
    queryKey: matterKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from("matters")
        .select("*, clients(full_name)", { count: "exact" })
        .order("created_at", { ascending: false });
      if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
      if (filters.search) {
        query = query.or(`matter_name.ilike.%${filters.search}%,matter_number.ilike.%${filters.search}%`);
      }
      if (filters.from != null && filters.to != null) {
        query = query.range(filters.from, filters.to);
      }
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data as (Matter & { clients: { full_name: string } | null })[], count };
    },
  });
}

export function useMatter(id: string | undefined) {
  return useQuery({
    queryKey: matterKeys.detail(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matters")
        .select("*, clients(full_name)")
        .eq("id", id as string)
        .single();
      if (error) throw error;
      return data as Matter & { clients: { full_name: string } | null };
    },
  });
}

export type MatterInput = Pick<
  Matter,
  "matter_number" | "matter_name" | "client_id" | "practice_area_id" | "advocate_id" | "status" | "description" | "start_date" | "notes"
>;

export function useCreateMatter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<MatterInput>) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("firm_id")
        .eq("id", userData.user?.id ?? "")
        .single();
      if (!profile?.firm_id) throw new Error("No firm associated with this account.");

      const { data, error } = await supabase
        .from("matters")
        .insert({ ...input, firm_id: profile.firm_id } as TablesInsert<"matters">)        .select()
        .single();
      if (error) throw error;

      await supabase.from("activities").insert({
        firm_id: profile.firm_id,
        user_id: userData.user?.id,
        action: "matter.created",
        entity_type: "matter",
        entity_id: data.id,
        metadata: { name: data.matter_name },
      });

      return data as Matter;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: matterKeys.all }),
  });
}

export function useUpdateMatter(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<MatterInput> & { progress?: number; billed_amount?: number }) => {
      const { data, error } = await supabase.from("matters").update(input).eq("id", id).select().single();
      if (error) throw error;

      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("activities").insert({
        firm_id: data.firm_id,
        user_id: userData.user?.id,
        action: "matter.updated",
        entity_type: "matter",
        entity_id: id,
        metadata: {},
      });

      return data as Matter;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: matterKeys.all });
      qc.invalidateQueries({ queryKey: matterKeys.detail(id) });
    },
  });
}

export function useDeleteMatter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("matters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: matterKeys.all }),
  });
}

export function useMatterTasks(matterId: string | undefined) {
  return useQuery({
    queryKey: ["matter", matterId, "tasks"],
    enabled: Boolean(matterId),
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("matter_id", matterId as string).order("due_date");
      if (error) throw error;
      return data;
    },
  });
}

export function useMatterDeadlines(matterId: string | undefined) {
  return useQuery({
    queryKey: ["matter", matterId, "deadlines"],
    enabled: Boolean(matterId),
    queryFn: async () => {
      const { data, error } = await supabase.from("deadlines").select("*").eq("matter_id", matterId as string).order("due_date");
      if (error) throw error;
      return data;
    },
  });
}

export function useMatterDocuments(matterId: string | undefined) {
  return useQuery({
    queryKey: ["matter", matterId, "documents"],
    enabled: Boolean(matterId),
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").eq("matter_id", matterId as string).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useMatterActivity(matterId: string | undefined) {
  return useQuery({
    queryKey: ["activities", "matter", matterId],
    enabled: Boolean(matterId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("entity_type", "matter")
        .eq("entity_id", matterId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Simple unpaginated id/name list for <select> dropdowns elsewhere (New
// Task, New Deadline, New Appointment) — same rationale as useClientOptions
// in queries/clients.ts.
export function useMatterOptions() {
  return useQuery({
    queryKey: ["matters", "options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("matters").select("id, matter_name").order("matter_name");
      if (error) throw error;
      return data as { id: string; matter_name: string }[];
    },
  });
}
