import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Deadline, TablesInsert } from "@/types/database";
export interface DeadlineFilters {
  search?: string;
}

const deadlineKeys = { all: ["deadlines"] as const, list: (f: DeadlineFilters) => [...deadlineKeys.all, "list", f] as const };

export function useDeadlines(filters: DeadlineFilters) {
  return useQuery({
    queryKey: deadlineKeys.list(filters),
    queryFn: async () => {
      let query = supabase.from("deadlines").select("*, matters(matter_name), clients(full_name)").order("due_date", { ascending: true });
      if (filters.search) query = query.ilike("title", `%${filters.search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as (Deadline & { matters: { matter_name: string } | null; clients: { full_name: string } | null })[];
    },
  });
}

export type DeadlineInput = Pick<Deadline, "title" | "description" | "matter_id" | "client_id" | "owner_id" | "due_date" | "priority" | "status">;

export function useCreateDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<DeadlineInput>) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("firm_id").eq("id", userData.user?.id ?? "").single();
      if (!profile?.firm_id) throw new Error("No firm associated with this account.");
      const { data, error } = await supabase.from("deadlines").insert({ ...input, firm_id: profile.firm_id } as TablesInsert<"deadlines">).select().single();
      if (error) throw error;
      await supabase.from("activities").insert({
        firm_id: profile.firm_id, user_id: userData.user?.id, action: "deadline.created",
        entity_type: "deadline", entity_id: data.id, metadata: { title: data.title },
      });
      return data as Deadline;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: deadlineKeys.all }),
  });
}

export function useUpdateDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<DeadlineInput> & { id: string }) => {
      const { data, error } = await supabase.from("deadlines").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data as Deadline;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: deadlineKeys.all }),
  });
}

export function useDeleteDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deadlines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: deadlineKeys.all }),
  });
}
