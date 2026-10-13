import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useRevenueReport() {
  return useQuery({
    queryKey: ["reports", "revenue"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("amount, payment_date");
      if (error) throw error;
      const byMonth: Record<string, number> = {};
      for (const p of data) {
        const month = p.payment_date.slice(0, 7);
        byMonth[month] = (byMonth[month] ?? 0) + Number(p.amount);
      }
      return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, total]) => ({ month, total }));
    },
  });
}

export function useOutstandingInvoicesReport() {
  return useQuery({
    queryKey: ["reports", "outstanding-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("invoice_number, total, amount_paid, due_date, status").in("status", ["sent", "partially_paid", "overdue"]);
      if (error) throw error;
      return data.map((i) => ({ ...i, balance: Number(i.total) - Number(i.amount_paid) })).sort((a, b) => b.balance - a.balance);
    },
  });
}

export function useQuoteConversionReport() {
  return useQuery({
    queryKey: ["reports", "quote-conversion"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes").select("status");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const q of data) counts[q.status] = (counts[q.status] ?? 0) + 1;
      return Object.entries(counts).map(([status, count]) => ({ status, count }));
    },
  });
}

export function useLeadConversionReport() {
  return useQuery({
    queryKey: ["reports", "lead-conversion"],
    queryFn: async () => {
      const [total, converted] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "converted"),
      ]);
      const totalCount = total.count ?? 0;
      const convertedCount = converted.count ?? 0;
      return { totalCount, convertedCount, rate: totalCount > 0 ? (convertedCount / totalCount) * 100 : 0 };
    },
  });
}

export function useAdvocateWorkloadReport() {
  return useQuery({
    queryKey: ["reports", "advocate-workload"],
    queryFn: async () => {
      const { data, error } = await supabase.from("matters").select("status, profiles!matters_advocate_id_fkey(full_name)").eq("status", "active");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data as unknown as { profiles: { full_name: string } | null }[]) {
        const name = row.profiles?.full_name ?? "Unassigned";
        counts[name] = (counts[name] ?? 0) + 1;
      }
      return Object.entries(counts).map(([name, count]) => ({ name, count }));
    },
  });
}

export function useMatterStatusReport() {
  return useQuery({
    queryKey: ["reports", "matter-status"],
    queryFn: async () => {
      const { data, error } = await supabase.from("matters").select("status");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const m of data) counts[m.status] = (counts[m.status] ?? 0) + 1;
      return Object.entries(counts).map(([status, count]) => ({ status, count }));
    },
  });
}

export function useNewClientsReport() {
  return useQuery({
    queryKey: ["reports", "new-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("created_at");
      if (error) throw error;
      const byMonth: Record<string, number> = {};
      for (const c of data) {
        const month = c.created_at.slice(0, 7);
        byMonth[month] = (byMonth[month] ?? 0) + 1;
      }
      return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }));
    },
  });
}

// A firm-wide "how does business flow through us" view. Presented as
// pipeline STAGE COUNTS, deliberately not as a strict percentage-of-
// previous-stage conversion rate — the schema doesn't causally link a
// matter back to the quote (or consultation) that produced it, so
// "quotes accepted → matters opened" is a reasonable proxy, not a joined,
// provably-causal figure. Overstating precision here would be worse than
// just showing the honest counts and letting the reader draw the
// conclusion.
export function useLeadRevenueFunnel() {
  return useQuery({
    queryKey: ["reports", "lead-revenue-funnel"],
    queryFn: async () => {
      const [leads, consultations, quotesSent, quotesAccepted, matters, payments] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("type", "consultation").not("lead_id", "is", null),
        supabase.from("quotes").select("id", { count: "exact", head: true }).neq("status", "draft"),
        supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "accepted"),
        supabase.from("matters").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("amount"),
      ]);
      const totalRevenue = (payments.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
      return {
        stages: [
          { label: "Leads", value: leads.count ?? 0 },
          { label: "Consultations booked", value: consultations.count ?? 0 },
          { label: "Quotes sent", value: quotesSent.count ?? 0 },
          { label: "Quotes accepted", value: quotesAccepted.count ?? 0 },
          { label: "Matters opened", value: matters.count ?? 0 },
        ],
        totalRevenue,
      };
    },
  });
}
