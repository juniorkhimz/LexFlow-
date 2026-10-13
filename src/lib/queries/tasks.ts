import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Task, TaskStatus, TablesInsert } from "@/types/database";
export interface TaskFilters {
  search?: string;
  status?: TaskStatus | "all";
  from?: number;
  to?: number;
}

const taskKeys = {
  all: ["tasks"] as const,
  list: (filters: TaskFilters) => [...taskKeys.all, "list", filters] as const,
};

export function useTasks(filters: TaskFilters) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select("*, matters(matter_name)", { count: "exact" })
        .order("due_date", { ascending: true, nullsFirst: false });
      if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
      if (filters.search) query = query.ilike("title", `%${filters.search}%`);
      if (filters.from != null && filters.to != null) query = query.range(filters.from, filters.to);
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data as (Task & { matters: { matter_name: string } | null })[], count };
    },
  });
}

export type TaskInput = Pick<Task, "title" | "description" | "matter_id" | "assigned_to" | "priority" | "status" | "due_date">;

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<TaskInput>) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("firm_id").eq("id", userData.user?.id ?? "").single();
      if (!profile?.firm_id) throw new Error("No firm associated with this account.");
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...input, firm_id: profile.firm_id, created_by: userData.user?.id } as TablesInsert<"tasks">)        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<TaskInput> & { id: string }) => {
      const { data, error } = await supabase.from("tasks").update(input).eq("id", id).select().single();
      if (error) throw error;
      if (input.status === "completed") {
        await supabase.from("activities").insert({
          firm_id: data.firm_id,
          action: "task.completed",
          entity_type: "task",
          entity_id: id,
          metadata: { title: data.title },
        });
      }
      return data as Task;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
