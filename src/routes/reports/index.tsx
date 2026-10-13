import { useDocumentTitle } from "@/hooks/use-document-title";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyDisplay, DateDisplay } from "@/components/ui/display";
import { EmptyState, LoadingState } from "@/components/ui/states";
import {
  useRevenueReport, useOutstandingInvoicesReport, useQuoteConversionReport,
  useLeadConversionReport, useAdvocateWorkloadReport, useMatterStatusReport, useNewClientsReport,
  useLeadRevenueFunnel,
} from "@/lib/queries/reports";

const CHART_COLORS_FUNNEL = ["#96742f", "#b08d3f", "#2a5b8a", "#2f6f4e", "#5b6a8f"];

function ChartCard({ title, isLoading, empty, children }: { title: string; isLoading: boolean; empty: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <LoadingState /> : empty ? <EmptyState title="No data yet" /> : children}
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  useDocumentTitle("Reports");
  const revenue = useRevenueReport();
  const outstanding = useOutstandingInvoicesReport();
  const quoteConversion = useQuoteConversionReport();
  const leadConversion = useLeadConversionReport();
  const workload = useAdvocateWorkloadReport();
  const matterStatus = useMatterStatusReport();
  const newClients = useNewClientsReport();
  const funnel = useLeadRevenueFunnel();

  return (
    <div>
      <PageHeader title="Reports" description="Firm performance across leads, matters, and billing." />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase text-ink-400">Lead conversion rate</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink-900">
              {leadConversion.isLoading ? "…" : `${leadConversion.data?.rate.toFixed(0) ?? 0}%`}
            </p>
            <p className="text-xs text-ink-400">{leadConversion.data?.convertedCount ?? 0} of {leadConversion.data?.totalCount ?? 0} leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase text-ink-400">Outstanding balance</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink-900">
              <CurrencyDisplay amount={(outstanding.data ?? []).reduce((s, i) => s + i.balance, 0)} />
            </p>
            <p className="text-xs text-ink-400">{outstanding.data?.length ?? 0} unpaid invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase text-ink-400">Revenue collected</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink-900">
              <CurrencyDisplay amount={(revenue.data ?? []).reduce((s, r) => s + r.total, 0)} />
            </p>
            <p className="text-xs text-ink-400">All time</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle>Lead → Revenue funnel</CardTitle></CardHeader>
        <CardContent>
          {funnel.isLoading ? (
            <LoadingState />
          ) : !funnel.data || funnel.data.stages.every((s) => s.value === 0) ? (
            <EmptyState title="No pipeline activity yet" description="Leads, consultations, quotes, and matters will build this funnel over time." />
          ) : (
            <>
              <div className="space-y-2">
                {funnel.data.stages.map((stage, i) => {
                  const maxValue = funnel.data!.stages[0]?.value || 1;
                  const widthPct = Math.max(4, (stage.value / maxValue) * 100);
                  return (
                    <div key={stage.label} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 text-sm text-ink-600">{stage.label}</span>
                      <div className="h-7 flex-1 overflow-hidden rounded bg-ink-50">
                        <div
                          className="flex h-full items-center rounded px-2 text-xs font-medium text-white"
                          style={{ width: `${widthPct}%`, backgroundColor: CHART_COLORS_FUNNEL[i % CHART_COLORS_FUNNEL.length] }}
                        >
                          {stage.value}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
                <span className="text-sm text-ink-500">Total revenue collected from this pipeline</span>
                <span className="font-display text-lg font-semibold text-ink-900"><CurrencyDisplay amount={funnel.data.totalRevenue} /></span>
              </div>
              <p className="mt-2 text-xs text-ink-400">
                Stage counts, not a strict conversion rate — the schema doesn't causally link a specific matter back to
                the exact quote or consultation that produced it, so treat this as pipeline volume at each stage, not a
                precise percentage-conversion figure.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Monthly revenue" isLoading={revenue.isLoading} empty={!revenue.data?.length}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenue.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eceff6" />
              <XAxis dataKey="month" fontSize={11} stroke="#8593b3" />
              <YAxis fontSize={11} stroke="#8593b3" />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#96742f" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="New clients per month" isLoading={newClients.isLoading} empty={!newClients.data?.length}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={newClients.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eceff6" />
              <XAxis dataKey="month" fontSize={11} stroke="#8593b3" />
              <YAxis fontSize={11} allowDecimals={false} stroke="#8593b3" />
              <Tooltip />
              <Bar dataKey="count" fill="#2a5b8a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Quote conversion" isLoading={quoteConversion.isLoading} empty={!quoteConversion.data?.length}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={quoteConversion.data} layout="vertical" margin={{ left: 24 }}>
              <XAxis type="number" allowDecimals={false} stroke="#8593b3" fontSize={12} />
              <YAxis type="category" dataKey="status" width={80} stroke="#8593b3" fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="#2f6f4e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Matters by status" isLoading={matterStatus.isLoading} empty={!matterStatus.data?.length}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={matterStatus.data} layout="vertical" margin={{ left: 24 }}>
              <XAxis type="number" allowDecimals={false} stroke="#8593b3" fontSize={12} />
              <YAxis type="category" dataKey="status" width={80} stroke="#8593b3" fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="#a3690f" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Advocate workload (active matters)" isLoading={workload.isLoading} empty={!workload.data?.length}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={workload.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eceff6" />
              <XAxis dataKey="name" fontSize={11} stroke="#8593b3" />
              <YAxis fontSize={11} allowDecimals={false} stroke="#8593b3" />
              <Tooltip />
              <Bar dataKey="count" fill="#5b6a8f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Outstanding invoices" isLoading={outstanding.isLoading} empty={!outstanding.data?.length}>
          <ul className="max-h-56 divide-y divide-ink-100 overflow-y-auto">
            {(outstanding.data ?? []).map((i) => (
              <li key={i.invoice_number} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="text-ink-800">{i.invoice_number}</p>
                  <p className="text-xs text-ink-400"><DateDisplay value={i.due_date} /></p>
                </div>
                <CurrencyDisplay amount={i.balance} />
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>
    </div>
  );
}
