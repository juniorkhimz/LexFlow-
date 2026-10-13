import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Quote, QuoteItem, QuoteStatus } from "@/types/database";

const quoteKeys = {
  all: ["quotes"] as const,
  list: (f: { search?: string; status?: QuoteStatus | "all"; from?: number; to?: number }) => [...quoteKeys.all, "list", f] as const,
  detail: (id: string) => [...quoteKeys.all, "detail", id] as const,
};

export function useQuotes(filters: { search?: string; status?: QuoteStatus | "all"; from?: number; to?: number }) {
  return useQuery({
    queryKey: quoteKeys.list(filters),
    queryFn: async () => {
      let query = supabase.from("quotes").select("*, clients(full_name)", { count: "exact" }).order("created_at", { ascending: false });
      if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
      if (filters.search) query = query.ilike("quote_number", `%${filters.search}%`);
      if (filters.from != null && filters.to != null) query = query.range(filters.from, filters.to);
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data as (Quote & { clients: { full_name: string } | null })[], count };
    },
  });
}

export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: quoteKeys.detail(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, clients(full_name), quote_items(*)")
        .eq("id", id as string)
        .single();
      if (error) throw error;
      return data as Quote & { clients: { full_name: string } | null; quote_items: QuoteItem[] };
    },
  });
}

export type QuoteItemDraft = { description: string; quantity: number; unit_price: number; tax_rate: number; discount: number };

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { client_id: string; matter_id?: string | null; valid_until?: string | null; notes?: string; items: QuoteItemDraft[] }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("firm_id").eq("id", userData.user?.id ?? "").single();
      if (!profile?.firm_id) throw new Error("No firm associated with this account.");

      const quoteNumber = `Q-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const { data: quote, error } = await supabase
        .from("quotes")
        .insert({
          firm_id: profile.firm_id,
          quote_number: quoteNumber,
          client_id: input.client_id,
          matter_id: input.matter_id ?? null,
          valid_until: input.valid_until ?? null,
          notes: input.notes ?? null,
          status: "draft",
          created_by: userData.user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      if (input.items.length > 0) {
        const { error: itemsError } = await supabase.from("quote_items").insert(
          input.items.map((item, i) => ({ ...item, quote_id: quote.id, sort_order: i })),
        );
        if (itemsError) throw itemsError;
      }

      await supabase.from("activities").insert({
        firm_id: profile.firm_id, user_id: userData.user?.id, action: "quote.created",
        entity_type: "quote", entity_id: quote.id, metadata: { quote_number: quoteNumber },
      });

      return quote as Quote;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: quoteKeys.all }),
  });
}

export function useUpdateQuoteStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (status: QuoteStatus) => {
      const { data, error } = await supabase.from("quotes").update({ status }).eq("id", id).select().single();
      if (error) throw error;
      if (status === "accepted") {
        await supabase.from("activities").insert({
          firm_id: data.firm_id, action: "quote.accepted", entity_type: "quote", entity_id: id, metadata: {},
        });
      }
      return data as Quote;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quoteKeys.all });
      qc.invalidateQueries({ queryKey: quoteKeys.detail(id) });
    },
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: quoteKeys.all }),
  });
}

export function useDuplicateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quoteId: string) => {
      const { data: original, error } = await supabase.from("quotes").select("*, quote_items(*)").eq("id", quoteId).single();
      if (error) throw error;
      const { data: userData } = await supabase.auth.getUser();
      const quoteNumber = `Q-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const { data: copy, error: copyError } = await supabase
        .from("quotes")
        .insert({
          firm_id: original.firm_id,
          quote_number: quoteNumber,
          client_id: original.client_id,
          matter_id: original.matter_id,
          valid_until: original.valid_until,
          notes: original.notes,
          status: "draft",
          created_by: userData.user?.id,
        })
        .select()
        .single();
      if (copyError) throw copyError;

      const items = (original.quote_items as QuoteItem[]) ?? [];
      if (items.length > 0) {
        await supabase.from("quote_items").insert(
          items.map((item, i) => ({
            quote_id: copy.id, description: item.description, quantity: item.quantity,
            unit_price: item.unit_price, tax_rate: item.tax_rate, discount: item.discount, sort_order: i,
          })),
        );
      }
      return copy as Quote;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: quoteKeys.all }),
  });
}

export function useConvertQuoteToInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quoteId: string) => {
      const { data, error } = await supabase.rpc("convert_quote_to_invoice", { p_quote_id: quoteId });
      if (error) throw error;
      return data as string; // new invoice id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quoteKeys.all });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export const QUOTE_STATUSES: QuoteStatus[] = ["draft", "sent", "accepted", "rejected", "expired"];
