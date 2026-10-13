import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Client, ClientType, KycStatus, TablesInsert } from "@/types/database";
export interface ClientFilters {
  search?: string;
  clientType?: ClientType | "all";
  from?: number;
  to?: number;
}

const clientKeys = {
  all: ["clients"] as const,
  list: (filters: ClientFilters) => [...clientKeys.all, "list", filters] as const,
  detail: (id: string) => [...clientKeys.all, "detail", id] as const,
};

export function useClients(filters: ClientFilters) {
  return useQuery({
    queryKey: clientKeys.list(filters),
    queryFn: async () => {
      let query = supabase.from("clients").select("*", { count: "exact" }).order("created_at", { ascending: false });
      if (filters.clientType && filters.clientType !== "all") {
        query = query.eq("client_type", filters.clientType);
      }
      if (filters.search) {
        query = query.or(
          `full_name.ilike.%${filters.search}%,organization.ilike.%${filters.search}%,email.ilike.%${filters.search}%`,
        );
      }
      if (filters.from != null && filters.to != null) {
        query = query.range(filters.from, filters.to);
      }
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data as Client[], count };
    },
  });
}

// Simple unpaginated id/name list for <select> dropdowns elsewhere (New
// Matter, New Quote, New Invoice, New Appointment, Upload Document, New
// Conversation) — kept separate from useClients so those call sites don't
// need to know about the paginated {rows,count} shape the Clients list page uses.
export function useClientOptions() {
  return useQuery({
    queryKey: ["clients", "options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, full_name").order("full_name");
      if (error) throw error;
      return data as Pick<Client, "id" | "full_name">[];
    },
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: clientKeys.detail(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id as string).single();
      if (error) throw error;
      return data as Client;
    },
  });
}

export type ClientInput = Pick<
  Client,
  "full_name" | "organization" | "email" | "phone" | "address" | "id_number" | "client_type" | "kyc_status" | "notes"
>;

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ClientInput>) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("firm_id")
        .eq("id", userData.user?.id ?? "")
        .single();
      if (!profile?.firm_id) throw new Error("No firm associated with this account.");

      const { data, error } = await supabase
        .from("clients")
        .insert({ ...input, firm_id: profile.firm_id } as TablesInsert<"clients">)        .select()
        .single();
      if (error) throw error;

      await supabase.from("activities").insert({
        firm_id: profile.firm_id,
        user_id: userData.user?.id,
        action: "client.created",
        entity_type: "client",
        entity_id: data.id,
        metadata: { name: data.full_name },
      });

      return data as Client;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: clientKeys.all }),
  });
}

export function useUpdateClient(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ClientInput>) => {
      const { data, error } = await supabase.from("clients").update(input).eq("id", id).select().single();
      if (error) throw error;

      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("activities").insert({
        firm_id: data.firm_id,
        user_id: userData.user?.id,
        action: "client.updated",
        entity_type: "client",
        entity_id: id,
        metadata: {},
      });

      return data as Client;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientKeys.all });
      qc.invalidateQueries({ queryKey: clientKeys.detail(id) });
    },
  });
}

export function useUpdateKycStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (kyc_status: KycStatus) => {
      const { data, error } = await supabase.from("clients").update({ kyc_status }).eq("id", id).select().single();
      if (error) throw error;
      return data as Client;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientKeys.all });
      qc.invalidateQueries({ queryKey: clientKeys.detail(id) });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: clientKeys.all }),
  });
}

export function useClientActivity(clientId: string | undefined) {
  return useQuery({
    queryKey: ["activities", "client", clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("entity_type", "client")
        .eq("entity_id", clientId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
