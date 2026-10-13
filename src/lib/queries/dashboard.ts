import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Every count/sum here is a real Supabase query (head-count or aggregate),
// never a hardcoded number. When a firm has no data yet, these all resolve
// to 0 and the dashboard renders its empty states instead of fake stats.
export function useDashboardKpis() {
  return useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: async () => {
      const [leads, matters, quotes, clients, deadlines, invoices] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("matters").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "sent"),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase
          .from("deadlines")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .lte("due_date", new Date(Date.now() + 14 * 86400000).toISOString()),
        supabase.from("invoices").select("total, amount_paid").in("status", ["sent", "partially_paid", "overdue"]),
      ]);

      const outstanding = (invoices.data ?? []).reduce((sum, inv) => sum + (Number(inv.total) - Number(inv.amount_paid)), 0);

      return {
        totalLeads: leads.count ?? 0,
        activeMatters: matters.count ?? 0,
        openQuotes: quotes.count ?? 0,
        convertedClients: clients.count ?? 0,
        upcomingDeadlines: deadlines.count ?? 0,
        outstandingInvoices: outstanding,
      };
    },
  });
}

export function useLeadsByStatus() {
  return useQuery({
    queryKey: ["dashboard", "leads-by-status"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("status");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data) counts[row.status] = (counts[row.status] ?? 0) + 1;
      return Object.entries(counts).map(([status, count]) => ({ status, count }));
    },
  });
}

export function useMattersByPracticeArea() {
  return useQuery({
    queryKey: ["dashboard", "matters-by-practice-area"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matters")
        .select("practice_area_id, practice_areas(name)");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data as unknown as { practice_areas: { name: string } | null }[]) {
        const name = row.practice_areas?.name ?? "Unassigned";
        counts[name] = (counts[name] ?? 0) + 1;
      }
      return Object.entries(counts).map(([name, count]) => ({ name, count }));
    },
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ["dashboard", "recent-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });
}

export function useUpcomingDeadlines() {
  return useQuery({
    queryKey: ["dashboard", "upcoming-deadlines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deadlines")
        .select("*")
        .eq("status", "pending")
        .order("due_date", { ascending: true })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });
}

// ─── Command Center additions below ───────────────────────────────────
// Every value here is a real query, same discipline as the KPIs above —
// the "Priority" list surfaces genuinely overdue/critical items, not a
// simulated "AI noticed this" — that framing is reserved for the actual
// AI Insights panel (see useFirmInsights in ai-gateway.ts), which is
// clearly disclosed as such.

export function useTasksDueToday() {
  return useQuery({
    queryKey: ["dashboard", "tasks-due-today"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { count, error } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("due_date", today)
        .neq("status", "completed");
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useCriticalDeadlines() {
  return useQuery({
    queryKey: ["dashboard", "critical-deadlines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deadlines")
        .select("*, matters(matter_name)")
        .eq("status", "pending")
        .or("priority.eq.critical,due_date.lte." + new Date().toISOString())
        .order("due_date", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data as unknown as { id: string; title: string; due_date: string; priority: string; matters: { matter_name: string } | null }[];
    },
  });
}

export function useOverdueInvoices() {
  return useQuery({
    queryKey: ["dashboard", "overdue-invoices"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, total, amount_paid, due_date, clients(full_name)")
        .or(`status.eq.overdue,and(due_date.lt.${today},status.in.(sent,partially_paid))`)
        .order("due_date", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data as unknown as { id: string; invoice_number: string; total: number; amount_paid: number; due_date: string; clients: { full_name: string } | null }[];
    },
  });
}

export function useLeadsNeedingFollowup() {
  return useQuery({
    queryKey: ["dashboard", "leads-needing-followup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, company, created_at")
        .eq("status", "new")
        .order("created_at", { ascending: true }) // oldest-unattended first
        .limit(5);
      if (error) throw error;
      return data;
    },
  });
}

export function useCommandCenterCounts() {
  return useQuery({
    queryKey: ["dashboard", "command-center-counts"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [tasksToday, criticalDeadlines, overdueInvoices, newLeads] = await Promise.all([
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("due_date", today).neq("status", "completed"),
        supabase.from("deadlines").select("id", { count: "exact", head: true }).eq("status", "pending").or("priority.eq.critical,due_date.lte." + new Date().toISOString()),
        supabase.from("invoices").select("id", { count: "exact", head: true }).or(`status.eq.overdue,and(due_date.lt.${today},status.in.(sent,partially_paid))`),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
      ]);
      return {
        actionsToday: tasksToday.count ?? 0,
        criticalDeadlines: criticalDeadlines.count ?? 0,
        overdueInvoices: overdueInvoices.count ?? 0,
        newLeads: newLeads.count ?? 0,
      };
    },
  });
}
