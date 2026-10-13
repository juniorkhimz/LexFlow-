import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Every query here relies entirely on the "client select own …" RLS
// policies (supabase/migrations/0002_rls_policies.sql) — there is no
// client_id filter applied client-side. A portal user's Postgres session
// can only ever see rows where clients.profile_id = auth.uid() maps
// through auth_client_ids(). This file has no special privilege; it's
// just a thinner set of queries for a narrower UI.

export function usePortalClientRecord() {
  return useQuery({
    queryKey: ["portal", "my-client-record"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("clients").select("*").eq("profile_id", userData.user?.id ?? "").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function usePortalMatters() {
  return useQuery({
    queryKey: ["portal", "matters"],
    queryFn: async () => {
      const { data, error } = await supabase.from("matters").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePortalDocuments() {
  return useQuery({
    queryKey: ["portal", "documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePortalQuotes() {
  return useQuery({
    queryKey: ["portal", "quotes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePortalInvoices() {
  return useQuery({
    queryKey: ["portal", "invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePortalAppointments() {
  return useQuery({
    queryKey: ["portal", "appointments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("*").order("appointment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePortalMessages() {
  return useQuery({
    queryKey: ["portal", "messages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
