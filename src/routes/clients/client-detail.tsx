import * as React from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import * as Tabs from "@radix-ui/react-tabs";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CurrencyDisplay, DateDisplay } from "@/components/ui/display";
import { ActivityTimeline } from "@/components/ui/activity-timeline";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/states";
import { supabase } from "@/lib/supabase";
import { useClient, useDeleteClient, useClientActivity, useUpdateKycStatus } from "@/lib/queries/clients";
import type { KycStatus } from "@/types/database";

const KYC_STATUSES: KycStatus[] = ["pending", "verified", "rejected"];

// Lightweight, read-only cross-entity lookups scoped to this client. These
// intentionally query the tables directly (rather than waiting on the full
// Matters/Quotes/Invoices/Documents/Appointments modules) so the client
// profile is genuinely useful today — every number/row here is live.
function useClientMatters(clientId: string) {
  return useQuery({
    queryKey: ["client", clientId, "matters"],
    queryFn: async () => {
      const { data, error } = await supabase.from("matters").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
function useClientQuotes(clientId: string) {
  return useQuery({
    queryKey: ["client", clientId, "quotes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
function useClientInvoices(clientId: string) {
  return useQuery({
    queryKey: ["client", clientId, "invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
function useClientPayments(clientId: string) {
  return useQuery({
    queryKey: ["client", clientId, "payments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").eq("client_id", clientId).order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
function useClientAppointments(clientId: string) {
  return useQuery({
    queryKey: ["client", clientId, "appointments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("*").eq("client_id", clientId).order("appointment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
function useClientDocuments(clientId: string) {
  return useQuery({
    queryKey: ["client", clientId, "documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

const TAB_TRIGGER =
  "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-500 hover:text-ink-800 data-[state=active]:border-brass-500 data-[state=active]:text-ink-900";

export default function ClientDetailPage() {
  const { clientId } = useParams({ strict: false }) as { clientId: string };
  const navigate = useNavigate();
  const { data: client, isLoading, isError, refetch } = useClient(clientId);
  const { data: activity } = useClientActivity(clientId);
  const deleteClient = useDeleteClient();
  const updateKyc = useUpdateKycStatus(clientId);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const matters = useClientMatters(clientId);
  const quotes = useClientQuotes(clientId);
  const invoices = useClientInvoices(clientId);
  const payments = useClientPayments(clientId);
  const appointments = useClientAppointments(clientId);
  const documents = useClientDocuments(clientId);

  if (isLoading) return <LoadingState label="Loading client…" />;
  if (isError || !client) return <ErrorState message="Unable to load this client." onRetry={() => refetch()} />;

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/clients" })} className="mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to clients
      </Button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">{client.full_name}</h1>
          {client.organization && <p className="text-sm text-ink-500">{client.organization}</p>}
        </div>
        <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      <Tabs.Root defaultValue="overview">
        <Tabs.List className="mb-4 flex flex-wrap gap-1 border-b border-ink-100">
          <Tabs.Trigger value="overview" className={TAB_TRIGGER}>Overview</Tabs.Trigger>
          <Tabs.Trigger value="matters" className={TAB_TRIGGER}>Matters ({matters.data?.length ?? 0})</Tabs.Trigger>
          <Tabs.Trigger value="documents" className={TAB_TRIGGER}>Documents ({documents.data?.length ?? 0})</Tabs.Trigger>
          <Tabs.Trigger value="quotes" className={TAB_TRIGGER}>Quotes ({quotes.data?.length ?? 0})</Tabs.Trigger>
          <Tabs.Trigger value="invoices" className={TAB_TRIGGER}>Invoices ({invoices.data?.length ?? 0})</Tabs.Trigger>
          <Tabs.Trigger value="payments" className={TAB_TRIGGER}>Payments ({payments.data?.length ?? 0})</Tabs.Trigger>
          <Tabs.Trigger value="appointments" className={TAB_TRIGGER}>Appointments ({appointments.data?.length ?? 0})</Tabs.Trigger>
          <Tabs.Trigger value="activity" className={TAB_TRIGGER}>Activity</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview">
          <Card>
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase text-ink-400">Client type</p>
                <p className="mt-1 capitalize text-ink-800">{client.client_type}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-ink-400">KYC status</p>
                <select
                  className="mt-1 rounded-md border border-ink-200 bg-surface-raised px-2 py-1 text-sm"
                  value={client.kyc_status}
                  onChange={(e) => updateKyc.mutate(e.target.value as KycStatus)}
                >
                  {KYC_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs uppercase text-ink-400">Email</p>
                <p className="mt-1 text-ink-800">{client.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-ink-400">Phone</p>
                <p className="mt-1 text-ink-800">{client.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-ink-400">Address</p>
                <p className="mt-1 text-ink-800">{client.address ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-ink-400">ID / passport number</p>
                <p className="mt-1 text-ink-800">{client.id_number ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-ink-400">Client since</p>
                <p className="mt-1 text-ink-800"><DateDisplay value={client.created_at} /></p>
              </div>
              {client.notes && (
                <div className="col-span-2">
                  <p className="text-xs uppercase text-ink-400">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-ink-800">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </Tabs.Content>

        <Tabs.Content value="matters">
          {matters.isLoading ? <LoadingState /> : !matters.data?.length ? (
            <EmptyState title="No matters yet" description="Matters opened for this client will appear here." />
          ) : (
            <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-surface-raised">
              {matters.data.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div><p className="font-medium text-ink-900">{m.matter_name}</p><p className="text-xs text-ink-400">{m.matter_number}</p></div>
                  <StatusBadge status={m.status} />
                </li>
              ))}
            </ul>
          )}
        </Tabs.Content>

        <Tabs.Content value="documents">
          {documents.isLoading ? <LoadingState /> : !documents.data?.length ? (
            <EmptyState title="No documents yet" description="Upload documents from the Documents module once it's built out." />
          ) : (
            <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-surface-raised">
              {documents.data.map((d) => (
                <li key={d.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-ink-800">{d.name}</span>
                  <StatusBadge status={d.category} />
                </li>
              ))}
            </ul>
          )}
        </Tabs.Content>

        <Tabs.Content value="quotes">
          {quotes.isLoading ? <LoadingState /> : !quotes.data?.length ? (
            <EmptyState title="No quotes yet" />
          ) : (
            <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-surface-raised">
              {quotes.data.map((q) => (
                <li key={q.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-ink-800">{q.quote_number}</span>
                  <div className="flex items-center gap-3">
                    <CurrencyDisplay amount={q.total} currency={q.currency} />
                    <StatusBadge status={q.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tabs.Content>

        <Tabs.Content value="invoices">
          {invoices.isLoading ? <LoadingState /> : !invoices.data?.length ? (
            <EmptyState title="No invoices yet" />
          ) : (
            <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-surface-raised">
              {invoices.data.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-ink-800">{inv.invoice_number}</span>
                  <div className="flex items-center gap-3">
                    <CurrencyDisplay amount={inv.total} currency={inv.currency} />
                    <StatusBadge status={inv.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tabs.Content>

        <Tabs.Content value="payments">
          {payments.isLoading ? <LoadingState /> : !payments.data?.length ? (
            <EmptyState title="No payments recorded yet" />
          ) : (
            <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-surface-raised">
              {payments.data.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div><CurrencyDisplay amount={p.amount} /> <span className="text-xs uppercase text-ink-400">{p.method.replace("_", " ")}</span></div>
                  <DateDisplay value={p.payment_date} />
                </li>
              ))}
            </ul>
          )}
        </Tabs.Content>

        <Tabs.Content value="appointments">
          {appointments.isLoading ? <LoadingState /> : !appointments.data?.length ? (
            <EmptyState title="No appointments yet" />
          ) : (
            <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-surface-raised">
              {appointments.data.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div><p className="text-ink-800">{a.title}</p><DateDisplay value={a.appointment_date} /></div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Tabs.Content>

        <Tabs.Content value="activity">
          <Card>
            <CardContent className="pt-4">
              <ActivityTimeline activities={activity ?? []} />
            </CardContent>
          </Card>
        </Tabs.Content>
      </Tabs.Root>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this client?"
        description="This cannot be undone and will fail if matters, quotes, or invoices still reference this client."
        confirmLabel="Delete"
        destructive
        loading={deleteClient.isPending}
        onConfirm={async () => {
          await deleteClient.mutateAsync(client.id);
          navigate({ to: "/clients" });
        }}
      />
    </div>
  );
}
