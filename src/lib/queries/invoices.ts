import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Invoice, InvoiceItem, InvoiceStatus, Payment, PaymentMethod } from "@/types/database";

const invoiceKeys = {
  all: ["invoices"] as const,
  list: (f: { search?: string; status?: InvoiceStatus | "all"; from?: number; to?: number }) => [...invoiceKeys.all, "list", f] as const,
  detail: (id: string) => [...invoiceKeys.all, "detail", id] as const,
};

export function useInvoices(filters: { search?: string; status?: InvoiceStatus | "all"; from?: number; to?: number }) {
  return useQuery({
    queryKey: invoiceKeys.list(filters),
    queryFn: async () => {
      let query = supabase.from("invoices").select("*, clients(full_name)", { count: "exact" }).order("created_at", { ascending: false });
      if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
      if (filters.search) query = query.ilike("invoice_number", `%${filters.search}%`);
      if (filters.from != null && filters.to != null) query = query.range(filters.from, filters.to);
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data as (Invoice & { clients: { full_name: string } | null })[], count };
    },
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: invoiceKeys.detail(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, clients(full_name), invoice_items(*), payments(*)")
        .eq("id", id as string)
        .single();
      if (error) throw error;
      return data as Invoice & { clients: { full_name: string } | null; invoice_items: InvoiceItem[]; payments: Payment[] };
    },
  });
}

export type LineItemDraftInput = { description: string; quantity: number; unit_price: number; tax_rate: number; discount: number };

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { client_id: string; matter_id?: string | null; due_date?: string | null; notes?: string; items: LineItemDraftInput[] }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("firm_id").eq("id", userData.user?.id ?? "").single();
      if (!profile?.firm_id) throw new Error("No firm associated with this account.");

      const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const { data: invoice, error } = await supabase
        .from("invoices")
        .insert({
          firm_id: profile.firm_id,
          invoice_number: invoiceNumber,
          client_id: input.client_id,
          matter_id: input.matter_id ?? null,
          due_date: input.due_date ?? null,
          notes: input.notes ?? null,
          status: "draft",
          created_by: userData.user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      if (input.items.length > 0) {
        const { error: itemsError } = await supabase.from("invoice_items").insert(
          input.items.map((item, i) => ({ ...item, invoice_id: invoice.id, sort_order: i })),
        );
        if (itemsError) throw itemsError;
      }

      await supabase.from("activities").insert({
        firm_id: profile.firm_id, user_id: userData.user?.id, action: "invoice.created",
        entity_type: "invoice", entity_id: invoice.id, metadata: { invoice_number: invoiceNumber },
      });

      return invoice as Invoice;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: invoiceKeys.all }),
  });
}

export function useUpdateInvoiceStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (status: InvoiceStatus) => {
      const { data, error } = await supabase.from("invoices").update({ status }).eq("id", id).select().single();
      if (error) throw error;
      return data as Invoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      qc.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: invoiceKeys.all }),
  });
}

export function useRecordPayment(invoiceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { amount: number; payment_date: string; method: PaymentMethod; reference?: string; notes?: string }) => {
      const { data: invoice, error: invErr } = await supabase.from("invoices").select("firm_id, client_id").eq("id", invoiceId).single();
      if (invErr) throw invErr;
      const { data: userData } = await supabase.auth.getUser();

      const { data: payment, error } = await supabase
        .from("payments")
        .insert({ ...input, invoice_id: invoiceId, firm_id: invoice.firm_id, client_id: invoice.client_id, recorded_by: userData.user?.id })
        .select()
        .single();
      if (error) throw error;

      // invoices.amount_paid / status recompute automatically via
      // trg_recalc_invoice_payment_status (0005_billing_triggers.sql)
      await supabase.from("activities").insert({
        firm_id: invoice.firm_id, user_id: userData.user?.id, action: "payment.recorded",
        entity_type: "invoice", entity_id: invoiceId, metadata: { amount: input.amount, method: input.method },
      });

      return payment as Payment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) }),
  });
}

export const INVOICE_STATUSES: InvoiceStatus[] = ["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"];
export const PAYMENT_METHODS: PaymentMethod[] = ["mpesa", "bank_transfer", "cash", "card", "other"];
