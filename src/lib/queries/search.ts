import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { supabase } from "@/lib/supabase";

export interface SearchResult {
  id: string;
  type: "lead" | "client" | "matter" | "quote" | "invoice";
  label: string;
  href: string;
}

// Debounced on the caller side (useDebouncedValue) so we never fire a query
// per keystroke — only after the user pauses typing.
export function useGlobalSearch(rawQuery: string) {
  const query = useDebouncedValue(rawQuery, 300);

  return useQuery({
    queryKey: ["global-search", query],
    enabled: query.trim().length > 1,
    queryFn: async (): Promise<SearchResult[]> => {
      const term = `%${query}%`;
      const [leads, clients, matters, quotes, invoices] = await Promise.all([
        supabase.from("leads").select("id, name").ilike("name", term).limit(5),
        supabase.from("clients").select("id, full_name").ilike("full_name", term).limit(5),
        supabase.from("matters").select("id, matter_name").ilike("matter_name", term).limit(5),
        supabase.from("quotes").select("id, quote_number").ilike("quote_number", term).limit(5),
        supabase.from("invoices").select("id, invoice_number").ilike("invoice_number", term).limit(5),
      ]);

      return [
        ...(leads.data ?? []).map((r) => ({ id: r.id, type: "lead" as const, label: r.name, href: `/leads/${r.id}` })),
        ...(clients.data ?? []).map((r) => ({ id: r.id, type: "client" as const, label: r.full_name, href: `/clients/${r.id}` })),
        ...(matters.data ?? []).map((r) => ({ id: r.id, type: "matter" as const, label: r.matter_name, href: `/matters/${r.id}` })),
        ...(quotes.data ?? []).map((r) => ({ id: r.id, type: "quote" as const, label: r.quote_number, href: `/quotes/${r.id}` })),
        ...(invoices.data ?? []).map((r) => ({ id: r.id, type: "invoice" as const, label: r.invoice_number, href: `/invoices/${r.id}` })),
      ];
    },
  });
}
