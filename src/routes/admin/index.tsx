import { ShieldCheck, LogOut } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useAuth } from "@/lib/auth";
import { useFirmsOverview } from "@/lib/queries/platform-admin";
import { StatusBadge } from "@/components/ui/status-badge";
import { DateDisplay } from "@/components/ui/display";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";

// Deliberately its own top-level shell — no staff sidebar (Leads/Matters/
// etc. are meaningless here, this isn't any one firm's workspace), no
// client-portal chrome either. A platform admin operates ACROSS firms; the
// UI should look and feel like a different tool, not a firm's Settings
// page with extra permissions, because it isn't the same privilege domain
// (see supabase/migrations/0013_platform_admins.sql for the full reasoning).
export default function AdminPage() {
  useDocumentTitle("Platform Admin");
  const { profile, signOut } = useAuth();
  const { data: firms, isLoading, isError, refetch } = useFirmsOverview();

  const activePaidCount = (firms ?? []).filter((f) => f.subscriptionStatus === "active").length;

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex h-14 items-center justify-between border-b border-ink-100 bg-nav-bg px-4 text-nav-text md:px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brass-400" />
          <span className="font-display text-sm font-semibold text-white">LexFlow Platform Admin</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span>{profile?.full_name}</span>
          <button onClick={() => signOut()} className="flex items-center gap-1 text-nav-text-muted hover:text-white">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4 md:p-6">
        <h1 className="mb-1 font-display text-2xl font-semibold text-ink-900">Firms</h1>
        <p className="mb-6 text-sm text-ink-500">
          Every firm on the platform, across all tenants — visible only here, not in any firm's own view of the app.
        </p>

        {isLoading ? (
          <LoadingState label="Loading firms…" />
        ) : isError ? (
          <ErrorState message="Unable to load firms overview." onRetry={() => refetch()} />
        ) : !firms || firms.length === 0 ? (
          <EmptyState title="No firms yet" />
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-ink-200 bg-surface-raised p-4">
                <p className="text-xs uppercase text-ink-400">Total firms</p>
                <p className="mt-1 font-display text-2xl font-semibold text-ink-900">{firms.length}</p>
              </div>
              <div className="rounded-lg border border-ink-200 bg-surface-raised p-4">
                <p className="text-xs uppercase text-ink-400">Active paid subscriptions</p>
                <p className="mt-1 font-display text-2xl font-semibold text-ink-900">{activePaidCount}</p>
              </div>
              <div className="rounded-lg border border-ink-200 bg-surface-raised p-4">
                <p className="text-xs uppercase text-ink-400">Total staff seats in use</p>
                <p className="mt-1 font-display text-2xl font-semibold text-ink-900">
                  {firms.reduce((sum, f) => sum + f.staffCount, 0)}
                </p>
              </div>
            </div>

            <p className="mb-2 text-xs text-ink-400">
              Revenue figures aren't computed here — this reads plan/status from our own `subscriptions` table, not
              live from Paystack. For actual revenue totals, use the Paystack Dashboard directly; this panel is for
              tenant/usage visibility, not a billing source of truth.
            </p>

            <div className="overflow-x-auto rounded-lg border border-ink-200 bg-surface-raised">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50/60">
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-ink-500">Firm</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-ink-500">Plan</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-ink-500">Status</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-ink-500">Staff</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-ink-500">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {firms.map((f) => (
                    <tr key={f.id} className="border-b border-ink-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-ink-900">{f.name}</td>
                      <td className="px-4 py-3 capitalize text-ink-700">{f.plan}</td>
                      <td className="px-4 py-3"><StatusBadge status={f.subscriptionStatus} /></td>
                      <td className="px-4 py-3 text-ink-700">{f.staffCount}</td>
                      <td className="px-4 py-3 text-ink-700"><DateDisplay value={f.createdAt} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
