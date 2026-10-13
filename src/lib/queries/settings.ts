import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Firm, PracticeArea, Profile } from "@/types/database";

export function useFirm() {
  return useQuery({
    queryKey: ["settings", "firm"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("firm_id").eq("id", userData.user?.id ?? "").single();
      if (!profile?.firm_id) throw new Error("No firm associated with this account.");
      const { data, error } = await supabase.from("firms").select("*").eq("id", profile.firm_id).single();
      if (error) throw error;
      return data as Firm;
    },
  });
}

export function useUpdateFirm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Pick<Firm, "name" | "email" | "phone" | "address" | "website" | "currency" | "tax_rate">>) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("firm_id").eq("id", userData.user?.id ?? "").single();
      if (!profile?.firm_id) throw new Error("No firm associated with this account.");
      const { data, error } = await supabase.from("firms").update(input).eq("id", profile.firm_id).select().single();
      if (error) throw error;
      return data as Firm;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings", "firm"] }),
  });
}

export function useFirmUsers() {
  return useQuery({
    queryKey: ["settings", "users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("full_name");
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Profile["role"] }) => {
      const { data, error } = await supabase.from("profiles").update({ role }).eq("id", id).select().single();
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings", "users"] }),
  });
}

export function usePracticeAreasSettings() {
  return useQuery({
    queryKey: ["settings", "practice-areas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("practice_areas").select("*").order("name");
      if (error) throw error;
      return data as PracticeArea[];
    },
  });
}

export function useCreatePracticeArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("firm_id").eq("id", userData.user?.id ?? "").single();
      if (!profile?.firm_id) throw new Error("No firm associated with this account.");
      const { data, error } = await supabase.from("practice_areas").insert({ firm_id: profile.firm_id, name }).select().single();
      if (error) throw error;
      return data as PracticeArea;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "practice-areas"] });
      qc.invalidateQueries({ queryKey: ["practice-areas"] });
    },
  });
}

export function useDeletePracticeArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("practice_areas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "practice-areas"] });
      qc.invalidateQueries({ queryKey: ["practice-areas"] });
    },
  });
}

export function useUpdateOwnProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Pick<Profile, "full_name" | "phone">>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in.");
      const { data, error } = await supabase.from("profiles").update(input).eq("id", userData.user.id).select().single();
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings", "users"] }),
  });
}
