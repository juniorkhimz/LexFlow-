import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface PlanLimits {
  plan: string;
  maxStaffUsers: number | null; // null = unlimited
  clientPortal: boolean;
  currentStaffCount: number;
  pendingStaffInvites: number;
  maxDocuments: number | null; // null = unlimited
  maxStorageMb: number | null; // null = unlimited
  currentDocumentCount: number;
  currentStorageBytes: number;
}

// Mirrors the same numbers enforced at the database level (see
// 0010_plan_limits_and_gating.sql and 0011_storage_quota_gating.sql —
// plan_limits table, can_invite_staff_user(), firm_has_client_portal(),
// can_upload_document()). This hook exists so the UI can show a clear
// "you're at your plan's limit" message and disable the action BEFORE
// submitting, rather than only finding out from a raw RLS policy violation
// after the fact. The database checks are still what actually enforce this
// — this is just a nicer front door to the same rule.
export function usePlanLimits() {
  return useQuery({
    queryKey: ["plan-limits"],
    queryFn: async (): Promise<PlanLimits> => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("firm_id").eq("id", userData.user?.id ?? "").single();
      const firmId = profile?.firm_id;
      if (!firmId) throw new Error("No firm associated with this account.");

      const [{ data: subscription }, { count: staffCount }, { count: pendingCount }, { data: documentRows }] = await Promise.all([
        supabase.from("subscriptions").select("plan, status").eq("firm_id", firmId).maybeSingle(),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("firm_id", firmId).neq("role", "client"),
        supabase.from("invitations").select("id", { count: "exact", head: true }).eq("firm_id", firmId).eq("status", "pending").neq("role", "client"),
        supabase.from("documents").select("size_bytes").eq("firm_id", firmId),
      ]);

      const plan = subscription?.status === "active" ? subscription.plan : "free";
      const { data: limits } = await supabase.from("plan_limits").select("*").eq("plan", plan).maybeSingle();

      const currentDocumentCount = documentRows?.length ?? 0;
      const currentStorageBytes = (documentRows ?? []).reduce((sum, d) => sum + (d.size_bytes ?? 0), 0);

      return {
        plan,
        maxStaffUsers: limits?.max_staff_users ?? null,
        clientPortal: limits?.client_portal ?? false,
        currentStaffCount: staffCount ?? 0,
        pendingStaffInvites: pendingCount ?? 0,
        maxDocuments: limits?.max_documents ?? null,
        maxStorageMb: limits?.max_storage_mb ?? null,
        currentDocumentCount,
        currentStorageBytes,
      };
    },
  });
}
