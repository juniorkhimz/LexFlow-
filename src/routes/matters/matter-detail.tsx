import * as React from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import * as Tabs from "@radix-ui/react-tabs";
import { ArrowLeft, Trash2, Sparkles, AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CurrencyDisplay, DateDisplay } from "@/components/ui/display";
import { ActivityTimeline } from "@/components/ui/activity-timeline";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/states";
import {
  useMatter, useUpdateMatter, useDeleteMatter, useMatterTasks,
  useMatterDeadlines, useMatterDocuments, useMatterActivity,
} from "@/lib/queries/matters";
import { useMatterAiRequest, type AiGatewayResponse } from "@/lib/queries/ai-gateway";
import type { MatterStatus } from "@/types/database";

const STATUSES: MatterStatus[] = ["intake", "active", "pending", "on_hold", "completed", "closed"];

const TAB_TRIGGER =
  "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-500 hover:text-ink-800 data-[state=active]:border-brass-500 data-[state=active]:text-ink-900";

// Talks to the ai-gateway Edge Function — see that function's own
// top-of-file comment for the full safety model. This component's job is
// to make sure that model is never undermined at the UI layer: if a
// response comes back in "synthetic" mode, the disclaimer is rendered
// ABOVE the AI text, in a color that can't be mistaken for a normal
// success state, every single time — never a one-line footnote easy to
// miss.
function MatterAiTab({ matterId }: { matterId: string }) {
  const aiRequest = useMatterAiRequest();
  const [response, setResponse] = React.useState<AiGatewayResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [question, setQuestion] = React.useState("");

  const runRequest = async (requestType: "matter_summary" | "ask_matter") => {
    setError(null);
    setResponse(null);
    try {
      const result = await aiRequest.mutateAsync({ matterId, requestType, question: question || undefined });
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Ask this matter</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => runRequest("matter_summary")} disabled={aiRequest.isPending}>
              <Sparkles className="h-4 w-4" /> Summarize this matter
            </Button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="h-9 flex-1 rounded-md border border-ink-200 bg-surface-raised px-3 text-sm"
              placeholder="Ask a question about this matter…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runRequest("ask_matter")}
            />
            <Button size="sm" onClick={() => runRequest("ask_matter")} disabled={aiRequest.isPending || !question.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {aiRequest.isPending && <LoadingState label="Thinking…" />}
          {error && <p className="text-sm text-danger">{error}</p>}

          {response && !response.enabled && (
            <EmptyState title="AI matter insights aren't enabled yet" description={response.message} />
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function MatterDetailPage() {
  const { matterId } = useParams({ strict: false }) as { matterId: string };
  const navigate = useNavigate();
  const { data: matter, isLoading, isError, refetch } = useMatter(matterId);
  const updateMatter = useUpdateMatter(matterId);
  const deleteMatter = useDeleteMatter();
  const tasks = useMatterTasks(matterId);
  const deadlines = useMatterDeadlines(matterId);
  const documents = useMatterDocuments(matterId);
  const activity = useMatterActivity(matterId);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  if (isLoading) return <LoadingState label="Loading matter…" />;
  if (isError || !matter) return <ErrorState message="Unable to load this matter." onRetry={() => refetch()} />;

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/matters" })} className="mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to matters
      </Button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">{matter.matter_name}</h1>
          <p className="text-sm text-ink-500">{matter.matter_number} · {matter.clients?.full_name ?? "—"}</p>
        </div>
        <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      <Tabs.Root defaultValue="overview">
        <Tabs.List className="mb-4 flex flex-wrap gap-1 border-b border-ink-100">
          <Tabs.Trigger value="overview" className={TAB_TRIGGER}>Overview</Tabs.Trigger>
          <Tabs.Trigger value="tasks" className={TAB_TRIGGER}>Tasks ({tasks.data?.length ?? 0})</Tabs.Trigger>
          <Tabs.Trigger value="deadlines" className={TAB_TRIGGER}>Deadlines ({deadlines.data?.length ?? 0})</Tabs.Trigger>
          <Tabs.Trigger value="documents" className={TAB_TRIGGER}>Documents ({documents.data?.length ?? 0})</Tabs.Trigger>
          <Tabs.Trigger value="billing" className={TAB_TRIGGER}>Billing</Tabs.Trigger>
          <Tabs.Trigger value="notes" className={TAB_TRIGGER}>Notes</Tabs.Trigger>
          <Tabs.Trigger value="ai" className={TAB_TRIGGER}>AI Assistant</Tabs.Trigger>
          <Tabs.Trigger value="activity" className={TAB_TRIGGER}>Activity</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview">
          <Card>
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase text-ink-400">Status</p>
                <select
                  className="mt-1 rounded-md border border-ink-200 bg-surface-raised px-2 py-1 text-sm"
                  value={matter.status}
                  onChange={(e) => updateMatter.mutate({ status: e.target.value as MatterStatus })}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs uppercase text-ink-400">Client</p>
                <p className="mt-1 text-ink-800">{matter.clients?.full_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-ink-400">Start date</p>
                <p className="mt-1 text-ink-800"><DateDisplay value={matter.start_date} /></p>
              </div>
              <div>
                <p className="text-xs uppercase text-ink-400">Progress</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 w-32 overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full bg-brass-500" style={{ width: `${matter.progress}%` }} />
                  </div>
                  <span className="text-xs text-ink-500">{matter.progress}%</span>
                </div>
              </div>
              {matter.description && (
                <div className="col-span-2">
                  <p className="text-xs uppercase text-ink-400">Description</p>
                  <p className="mt-1 whitespace-pre-wrap text-ink-800">{matter.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </Tabs.Content>

        <Tabs.Content value="tasks">
          {tasks.isLoading ? <LoadingState /> : !tasks.data?.length ? (
            <EmptyState title="No tasks yet" description="Tasks assigned to this matter will appear here." />
          ) : (
            <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-surface-raised">
              {tasks.data.map((t) => (
                <li key={t.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-ink-800">{t.title}</span>
                  <div className="flex items-center gap-2">
                    <DateDisplay value={t.due_date} />
                    <StatusBadge status={t.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tabs.Content>

        <Tabs.Content value="deadlines">
          {deadlines.isLoading ? <LoadingState /> : !deadlines.data?.length ? (
            <EmptyState title="No deadlines yet" />
          ) : (
            <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-surface-raised">
              {deadlines.data.map((d) => (
                <li key={d.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-ink-800">{d.title}</span>
                  <div className="flex items-center gap-2">
                    <DateDisplay value={d.due_date} />
                    <StatusBadge status={d.priority} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tabs.Content>

        <Tabs.Content value="documents">
          {documents.isLoading ? <LoadingState /> : !documents.data?.length ? (
            <EmptyState title="No documents yet" />
          ) : (
            <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-surface-raised">
              {documents.data.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-ink-800">{doc.name}</span>
                  <StatusBadge status={doc.category} />
                </li>
              ))}
            </ul>
          )}
        </Tabs.Content>

        <Tabs.Content value="billing">
          <Card>
            <CardContent className="py-4 text-sm">
              <p className="text-xs uppercase text-ink-400">Billed amount</p>
              <p className="mt-1 font-display text-xl font-semibold text-ink-900"><CurrencyDisplay amount={matter.billed_amount} /></p>
              <p className="mt-3 text-ink-500">Full quote/invoice line-item billing lives in the Quotes and Invoices modules, linked to this matter.</p>
            </CardContent>
          </Card>
        </Tabs.Content>

        <Tabs.Content value="notes">
          <Card>
            <CardContent className="py-4 text-sm text-ink-800">
              {matter.notes ? <p className="whitespace-pre-wrap">{matter.notes}</p> : <p className="text-ink-400">No notes yet.</p>}
            </CardContent>
          </Card>
        </Tabs.Content>

        <Tabs.Content value="ai">
          <MatterAiTab matterId={matter.id} />
        </Tabs.Content>

        <Tabs.Content value="activity">
          <Card>
            <CardContent className="pt-4">
              <ActivityTimeline activities={activity.data ?? []} />
            </CardContent>
          </Card>
        </Tabs.Content>
      </Tabs.Root>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this matter?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteMatter.isPending}
        onConfirm={async () => {
          await deleteMatter.mutateAsync(matter.id);
          navigate({ to: "/matters" });
        }}
      />
    </div>
  );
}
