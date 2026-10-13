import * as React from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, UserCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CurrencyDisplay, DateDisplay } from "@/components/ui/display";
import { ActivityTimeline } from "@/components/ui/activity-timeline";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingState, ErrorState } from "@/components/ui/states";
import {
  useLead, useUpdateLead, useDeleteLead, useConvertLead, useLeadActivity,
} from "@/lib/queries/leads";
import { usePracticeAreas } from "@/lib/queries/practice-areas";
import { useStaffOptions } from "@/lib/queries/team";
import type { LeadStatus } from "@/types/database";

const STATUSES: LeadStatus[] = [
  "new", "contacted", "conflict_check", "under_review", "qualified",
  "consultation_scheduled", "quote_sent", "converted", "rejected",
];

export default function LeadDetailPage() {
  const { leadId } = useParams({ strict: false }) as { leadId: string };
  const navigate = useNavigate();
  const { data: lead, isLoading, isError, refetch } = useLead(leadId);
  const { data: activity } = useLeadActivity(leadId);
  const { data: practiceAreas } = usePracticeAreas();
  const { data: staff } = useStaffOptions();
  const updateLead = useUpdateLead(leadId);
  const deleteLead = useDeleteLead();
  const convertLead = useConvertLead();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [confirmConvert, setConfirmConvert] = React.useState(false);

  if (isLoading) return <LoadingState label="Loading lead…" />;
  if (isError || !lead) return <ErrorState message="Unable to load this lead." onRetry={() => refetch()} />;

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/leads" })} className="mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">{lead.name}</h1>
          {lead.company && <p className="text-sm text-ink-500">{lead.company}</p>}
        </div>
        <div className="flex items-center gap-2">
          {lead.status !== "converted" && (
            <Button size="sm" onClick={() => setConfirmConvert(true)}>
              <UserCheck className="h-4 w-4" /> Convert to client
            </Button>
          )}
          <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase text-ink-400">Status</p>
                <div className="mt-1">
                  <select
                    className="rounded-md border border-ink-200 bg-surface-raised px-2 py-1 text-sm"
                    value={lead.status}
                    onChange={(e) => updateLead.mutate({ status: e.target.value as LeadStatus })}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-ink-400">Priority</p>
                <p className="mt-1"><StatusBadge status={lead.priority} /></p>
              </div>
              <div>
                <p className="text-xs uppercase text-ink-400">Practice area</p>
                <select
                  className="mt-1 rounded-md border border-ink-200 bg-surface-raised px-2 py-1 text-sm"
                  value={lead.practice_area_id ?? ""}
                  onChange={(e) => updateLead.mutate({ practice_area_id: e.target.value || null })}
                >
                  <option value="">None</option>
                  {practiceAreas?.map((pa) => <option key={pa.id} value={pa.id}>{pa.name}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs uppercase text-ink-400">Assigned advocate</p>
                <select
                  className="mt-1 rounded-md border border-ink-200 bg-surface-raised px-2 py-1 text-sm"
                  value={lead.advocate_id ?? ""}
                  onChange={(e) => updateLead.mutate({ advocate_id: e.target.value || null })}
                >
                  <option value="">Unassigned</option>
                  {staff?.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs uppercase text-ink-400">Email</p>
                <p className="mt-1 text-ink-800">{lead.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-ink-400">Phone</p>
                <p className="mt-1 text-ink-800">{lead.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-ink-400">Source</p>
                <p className="mt-1 text-ink-800">{lead.source ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-ink-400">Estimated value</p>
                <p className="mt-1 text-ink-800">{lead.estimated_value != null ? <CurrencyDisplay amount={lead.estimated_value} /> : "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-ink-400">Created</p>
                <p className="mt-1 text-ink-800"><DateDisplay value={lead.created_at} /></p>
              </div>
              {lead.notes && (
                <div className="col-span-2">
                  <p className="text-xs uppercase text-ink-400">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-ink-800">{lead.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
          <CardContent>
            <ActivityTimeline activities={activity ?? []} />
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmConvert}
        onOpenChange={setConfirmConvert}
        title="Convert this lead to a client?"
        description="This creates a new client record linked to this lead and marks the lead as converted."
        confirmLabel="Convert"
        loading={convertLead.isPending}
        onConfirm={async () => {
          const clientId = await convertLead.mutateAsync(lead.id);
          setConfirmConvert(false);
          navigate({ to: `/clients/${clientId}` });
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this lead?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteLead.isPending}
        onConfirm={async () => {
          await deleteLead.mutateAsync(lead.id);
          navigate({ to: "/leads" });
        }}
      />
    </div>
  );
}
