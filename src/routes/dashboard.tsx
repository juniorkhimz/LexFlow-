import { useDocumentTitle } from "@/hooks/use-document-title";
import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import {
  UserPlus, Briefcase, FolderPlus, CalendarPlus, FileText, Receipt,
  AlertTriangle, Sparkles, Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { CurrencyDisplay, DateDisplay } from "@/components/ui/display";
import { ActivityTimeline } from "@/components/ui/activity-timeline";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/states";
import { useAuth } from "@/lib/auth";
import {
  useDashboardKpis, useLeadsByStatus, useMattersByPracticeArea,
  useRecentActivity, useUpcomingDeadlines, useCommandCenterCounts,
  useCriticalDeadlines, useOverdueInvoices, useLeadsNeedingFollowup,
} from "@/lib/queries/dashboard";
import { useFirmInsights, type AiGatewayResponse } from "@/lib/queries/ai-gateway";
import { formatDate } from "@/lib/utils";

const CHART_COLORS = ["#96742f", "#2a5b8a", "#2f6f4e", "#a3690f", "#a4342a", "#5b6a8f"];

function CountBadge({ label, value, tone }: { label: string; value: number; tone: "neutral" | "danger" | "warning" }) {
  const toneClass = tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-ink-900";
  return (
    <div className="rounded-lg border border-ink-200 bg-surface-raised px-4 py-3">
      <p className={`font-display text-2xl font-semibold ${toneClass}`}>{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}

// Real, queried items only — see src/lib/queries/dashboard.ts's "Command
// Center additions" section. Nothing here is AI-generated; that's reserved
// for FirmInsightsPanel below, which is clearly labeled as such.
function PriorityList() {
  const navigate = useNavigate();
  const criticalDeadlines = useCriticalDeadlines();
  const overdueInvoices = useOverdueInvoices();
  const leadsNeedingFollowup = useLeadsNeedingFollowup();

  const isLoading = criticalDeadlines.isLoading || overdueInvoices.isLoading || leadsNeedingFollowup.isLoading;
  const hasAny =
    (criticalDeadlines.data?.length ?? 0) > 0 ||
    (overdueInvoices.data?.length ?? 0) > 0 ||
    (leadsNeedingFollowup.data?.length ?? 0) > 0;

  if (isLoading) return <LoadingState label="Loading priorities…" />;
  if (!hasAny) return <EmptyState title="Nothing urgent right now" description="Critical deadlines, overdue invoices, and unattended leads will show up here." />;

  return (
    <ul className="divide-y divide-ink-100">
      {criticalDeadlines.data?.map((d) => (
        <li key={`deadline-${d.id}`} className="flex cursor-pointer items-center justify-between py-2.5 text-sm hover:bg-ink-50" onClick={() => navigate({ to: "/deadlines" })}>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-danger" />
            <div>
              <p className="text-ink-800">{d.title}</p>
              <p className="text-xs text-ink-400">{d.matters?.matter_name ?? "No matter linked"} · deadline</p>
            </div>
          </div>
          <DateDisplay value={d.due_date} opts={{ dateStyle: "medium" }} />
        </li>
      ))}
      {overdueInvoices.data?.map((inv) => (
        <li key={`invoice-${inv.id}`} className="flex cursor-pointer items-center justify-between py-2.5 text-sm hover:bg-ink-50" onClick={() => navigate({ to: `/invoices/${inv.id}` })}>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-danger" />
            <div>
              <p className="text-ink-800">{inv.invoice_number} — {inv.clients?.full_name ?? "—"}</p>
              <p className="text-xs text-ink-400">Payment overdue</p>
            </div>
          </div>
          <CurrencyDisplay amount={inv.total - inv.amount_paid} />
        </li>
      ))}
      {leadsNeedingFollowup.data?.map((lead) => (
        <li key={`lead-${lead.id}`} className="flex cursor-pointer items-center justify-between py-2.5 text-sm hover:bg-ink-50" onClick={() => navigate({ to: `/leads/${lead.id}` })}>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
            <div>
              <p className="text-ink-800">{lead.name}{lead.company ? ` — ${lead.company}` : ""}</p>
              <p className="text-xs text-ink-400">New lead, follow-up needed</p>
            </div>
          </div>
          <DateDisplay value={lead.created_at} opts={{ dateStyle: "medium" }} />
        </li>
      ))}
    </ul>
  );
}

// Talks to the ai-gateway Edge Function — see that function's own
// top-of-file comment for the full safety model. Same disclosure
// discipline as the Matter AI tab: the warning renders above the AI text,
// every time a synthetic-mode response comes back, never a footnote.
function FirmInsightsPanel() {
  const insights = useFirmInsights();
  const [response, setResponse] = React.useState<AiGatewayResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const run = async () => {
    setError(null);
    setResponse(null);
    try {
      setResponse(await insights.mutateAsync());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <div>
      {!response && !insights.isPending && (
        <Button size="sm" variant="outline" onClick={run}>
          <Sparkles className="h-4 w-4" /> Generate AI insights
        </Button>
      )}
      {insights.isPending && <LoadingState label="Thinking…" />}
      {error && <p className="text-sm text-danger">{error}</p>}
      {response && !response.enabled && (
        <EmptyState title="AI insights aren't enabled yet" description={response.message} />
      )}
      {response?.enabled && response.mode === "synthetic" && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{response.disclaimer}</p>
          </div>
          <div className="whitespace-pre-wrap rounded-md border border-ink-100 bg-ink-50 p-3 text-sm text-ink-800">
            {response.text}
          </div>
          <Button size="sm" variant="outline" onClick={run} disabled={insights.isPending}>
            <Send className="h-4 w-4" /> Refresh
          </Button>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
        <p className="mt-1 font-display text-2xl font-semibold text-ink-900">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  useDocumentTitle("Dashboard");
  const { profile } = useAuth();
  const navigate = useNavigate();
  const kpis = useDashboardKpis();
  const leadsByStatus = useLeadsByStatus();
  const mattersByArea = useMattersByPracticeArea();
  const recentActivity = useRecentActivity();
  const upcomingDeadlines = useUpcomingDeadlines();
  const commandCenterCounts = useCommandCenterCounts();

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink-900">Good morning, {firstName}</h1>
        <p className="mt-1 text-sm text-ink-500">{formatDate(new Date(), { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {/* Command Center strip — real counts only, see useCommandCenterCounts in
          src/lib/queries/dashboard.ts. Clicking a count jumps to the relevant module. */}
      {!commandCenterCounts.isLoading && commandCenterCounts.data && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button onClick={() => navigate({ to: "/tasks" })} className="text-left">
            <CountBadge label="Actions today" value={commandCenterCounts.data.actionsToday} tone="neutral" />
          </button>
          <button onClick={() => navigate({ to: "/deadlines" })} className="text-left">
            <CountBadge label="Critical deadlines" value={commandCenterCounts.data.criticalDeadlines} tone="danger" />
          </button>
          <button onClick={() => navigate({ to: "/invoices" })} className="text-left">
            <CountBadge label="Overdue invoices" value={commandCenterCounts.data.overdueInvoices} tone="warning" />
          </button>
          <button onClick={() => navigate({ to: "/leads" })} className="text-left">
            <CountBadge label="New leads" value={commandCenterCounts.data.newLeads} tone="neutral" />
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => navigate({ to: "/leads" })}><UserPlus className="h-4 w-4" /> New lead</Button>
        <Button size="sm" variant="outline" onClick={() => navigate({ to: "/clients" })}><Briefcase className="h-4 w-4" /> New client</Button>
        <Button size="sm" variant="outline" onClick={() => navigate({ to: "/matters" })}><FolderPlus className="h-4 w-4" /> Open matter</Button>
        <Button size="sm" variant="outline" onClick={() => navigate({ to: "/appointments" })}><CalendarPlus className="h-4 w-4" /> Book consultation</Button>
        <Button size="sm" variant="outline" onClick={() => navigate({ to: "/quotes" })}><FileText className="h-4 w-4" /> Create quote</Button>
        <Button size="sm" variant="outline" onClick={() => navigate({ to: "/invoices" })}><Receipt className="h-4 w-4" /> Create invoice</Button>
      </div>

      {/* Priority list + AI Insights — the "Command Center" pairing: real
          queried urgency (PriorityList) sits beside clearly-labeled,
          disclosed-as-synthetic AI commentary (FirmInsightsPanel), never
          blended into one undifferentiated feed. */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Priority</CardTitle></CardHeader>
          <CardContent><PriorityList /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>AI insights</CardTitle></CardHeader>
          <CardContent><FirmInsightsPanel /></CardContent>
        </Card>
      </div>
      
      {kpis.isLoading || !kpis.data ? (        <LoadingState label="Loading dashboard…" />
      ) : kpis.isError ? (
        <ErrorState message="Unable to load dashboard metrics." onRetry={() => kpis.refetch()} />
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Kpi label="Total leads" value={kpis.data.totalLeads} />
          <Kpi label="Active matters" value={kpis.data.activeMatters} />
          <Kpi label="Open quotes" value={kpis.data.openQuotes} />
          <Kpi label="Converted clients" value={kpis.data.convertedClients} />
          <Kpi label="Upcoming deadlines" value={kpis.data.upcomingDeadlines} />
          <Kpi label="Outstanding invoices" value={<CurrencyDisplay amount={kpis.data.outstandingInvoices} />} />
        </div>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Lead pipeline</CardTitle></CardHeader>
          <CardContent>
            {leadsByStatus.isLoading ? (
              <LoadingState />
            ) : !leadsByStatus.data || leadsByStatus.data.length === 0 ? (
              <EmptyState title="No leads yet" description="New leads will appear here as they're added." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={leadsByStatus.data} layout="vertical" margin={{ left: 24 }}>
                  <XAxis type="number" allowDecimals={false} stroke="#8593b3" fontSize={12} />
                  <YAxis type="category" dataKey="status" width={110} stroke="#8593b3" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#96742f" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Matters by practice area</CardTitle></CardHeader>
          <CardContent>
            {mattersByArea.isLoading ? (
              <LoadingState />
            ) : !mattersByArea.data || mattersByArea.data.length === 0 ? (
              <EmptyState title="No active matters yet" description="Open a matter from a converted client to see it here." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={mattersByArea.data} dataKey="count" nameKey="name" outerRadius={80}>
                    {mattersByArea.data.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent>
            {recentActivity.isLoading ? (
              <LoadingState />
            ) : (
              <ActivityTimeline activities={recentActivity.data ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Upcoming deadlines</CardTitle></CardHeader>
          <CardContent>
            {upcomingDeadlines.isLoading ? (
              <LoadingState />
            ) : !upcomingDeadlines.data || upcomingDeadlines.data.length === 0 ? (
              <EmptyState title="No upcoming deadlines" description="Deadlines within the next two weeks will show here." />
            ) : (
              <ul className="space-y-3">
                {upcomingDeadlines.data.map((d) => (
                  <li key={d.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-ink-800">{d.title}</p>
                      <DateDisplay value={d.due_date} opts={{ dateStyle: "medium" }} />
                    </div>
                    <StatusBadge status={d.priority} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
