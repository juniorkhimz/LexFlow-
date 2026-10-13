import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Appointment, AppointmentStatus, TablesInsert } from "@/types/database";
const apptKeys = { all: ["appointments"] as const, list: (f: { search?: string }) => [...apptKeys.all, "list", f] as const };

export function useAppointments(filters: { search?: string }) {
  return useQuery({
    queryKey: apptKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select("*, clients(full_name), leads(name), matters(matter_name)")
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true });
      if (filters.search) query = query.ilike("title", `%${filters.search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as (Appointment & {
        clients: { full_name: string } | null;
        leads: { name: string } | null;
        matters: { matter_name: string } | null;
      })[];
    },
  });
}

export type AppointmentInput = Pick<
  Appointment,
  "title" | "client_id" | "lead_id" | "matter_id" | "advocate_id" | "appointment_date" | "start_time" | "end_time" | "type" | "location" | "notes" | "status"
>;

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AppointmentInput>) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("firm_id").eq("id", userData.user?.id ?? "").single();
      if (!profile?.firm_id) throw new Error("No firm associated with this account.");
      const { data, error } = await supabase.from("appointments").insert({ ...input, firm_id: profile.firm_id } as TablesInsert<"appointments">).select().single();
      if (error) throw error;
      await supabase.from("activities").insert({
        firm_id: profile.firm_id, user_id: userData.user?.id, action: "appointment.booked",
        entity_type: "appointment", entity_id: data.id, metadata: { title: data.title },
      });
      return data as Appointment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: apptKeys.all }),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<AppointmentInput> & { id: string }) => {
      const { data, error } = await supabase.from("appointments").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: apptKeys.all }),
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: apptKeys.all }),
  });
}

export const APPOINTMENT_STATUSES: AppointmentStatus[] = ["scheduled", "confirmed", "completed", "cancelled", "no_show"];
