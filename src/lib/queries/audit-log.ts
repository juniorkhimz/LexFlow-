import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Activity } from "@/types/database";

export interface AuditLogFilters {
  entityType?: string;
  search?: string;
  from?: number;
  to?: number;
}

// Every module in the app already writes to `activities` on create/update/
// convert/pay/etc (see the mutation hooks across src/lib/queries/*) — this
// is the first screen that actually lets someone browse that trail firm-
// wide instead of only seeing fragments of it on the Dashboard or on
// individual entity detail pages. RLS ("staff select activities" in
// 0002_rls_policies.sql) already scopes this to the caller's own firm and
// excludes client-role users entirely.
export function useAuditLog(filters: AuditLogFilters) {
  return useQuery({
    queryKey: ["audit-log", filters],
    queryFn: async () => {
      let query = supabase
        .from("activities")
        .select("*, profiles(full_name)", { count: "exact" })
        .order("created_at", { ascending: false });
      if (filters.entityType && filters.entityType !== "all") {
        query = query.eq("entity_type", filters.entityType);
      }
      if (filters.search) {
        query = query.ilike("action", `%${filters.search}%`);
      }
      if (filters.from != null && filters.to != null) {
        query = query.range(filters.from, filters.to);
      }
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data as (Activity & { profiles: { full_name: string } | null })[], count };
    },
  });
}

export function useAuditLogEntityTypes() {
  return useQuery({
    queryKey: ["audit-log", "entity-types"],
    queryFn: async () => {
      // No SELECT DISTINCT in supabase-js's query builder — pull entity_type
      // for recent rows and dedupe client-side. Good enough for a filter
      // dropdown; not meant to be exhaustive back to the beginning of time.
      const { data, error } = await supabase.from("activities").select("entity_type").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return Array.from(new Set(data.map((r) => r.entity_type))).sort();
    },
  });
}
