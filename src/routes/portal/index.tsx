import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { Scale, Send, LogOut } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { CurrencyDisplay, DateDisplay } from "@/components/ui/display";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { getSignedDocumentUrl } from "@/lib/queries/documents";
import { useAuth } from "@/lib/auth";
import { useSendMessage } from "@/lib/queries/messages";
import { usePortalClientRecord, usePortalMatters, usePortalDocuments, usePortalQuotes, usePortalInvoices, usePortalAppointments, usePortalMessages } from "@/lib/queries/portal";
import { formatDate } from "@/lib/utils";
import { buildPortalTimeline } from "@/lib/portal-timeline";

const TAB_TRIGGER =
  "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-500 hover:text-ink-800 data-[state=active]:border-brass-500 data-[state=active]:text-ink-900";

// This route is registered as its own layout (portalLayoutRoute) in
// src/router.tsx, separate from the staff authedLayoutRoute — it uses
// requireAuth (any signed-in user, staff or client) rather than
// requireStaff, and renders its own minimal header instead of the staff
// sidebar. That keeps the client-portal surface visually and structurally
// separate from the staff app shell, on top of the RLS isolation already
// enforced at the database layer.
export default function PortalPage() {
  const { profile, signOut } = useAuth();
  const { data: client, isLoading: clientLoading } = usePortalClientRecord();
  const matters = usePortalMatters();
  const documents = usePortalDocuments();
  const quotes = usePortalQuotes();
  const invoices = usePortalInvoices();
  const appointments = usePortalAppointments();
  const messages = usePortalMessages();
  const sendMessage = useSendMessage();
  const [draft, setDraft] = React.useState("");

  const timeline = React.useMemo(() => {
    if (!matters.data || !documents.data || !quotes.data || !invoices.data || !appointments.data) return null;
    return buildPortalTimeline({
      matters: matters.data,
      documents: documents.data,
      quotes: quotes.data,
      invoices: invoices.data,
      appointments: appointments.data,
    });
  }, [matters.data, documents.data, quotes.data, invoices.data, appointments.data]);

  if (clientLoading) return <LoadingState label="Loading your account…" />;
  if (!client) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <EmptyState
          title="No client record linked"
          description="Your account isn't yet linked to a client record. Contact your firm to complete portal setup."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex h-14 items-center justify-between border-b border-ink-100 bg-surface-raised px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-brass-500" />
          <span className="font-display text-sm font-semibold text-ink-900">Client Portal</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-ink-600">
          <span>{profile?.full_name}</span>
          <button onClick={() => signOut()} className="flex items-center gap-1 text-ink-400 hover:text-danger">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4 md:p-6">
        <h1 className="mb-6 font-display text-2xl font-semibold text-ink-900">Welcome, {client.full_name}</h1>

        <Tabs.Root defaultValue="timeline">
          <Tabs.List className="mb-4 flex flex-wrap gap-1 border-b border-ink-100">
            <Tabs.Trigger value="timeline" className={TAB_TRIGGER}>My Case</Tabs.Trigger>
            <Tabs.Trigger value="matters" className={TAB_TRIGGER}>Matters</Tabs.Trigger>
            <Tabs.Trigger value="documents" className={TAB_TRIGGER}>Documents</Tabs.Trigger>
            <Tabs.Trigger value="quotes" className={TAB_TRIGGER}>Quotes</Tabs.Trigger>
            <Tabs.Trigger value="invoices" className={TAB_TRIGGER}>Invoices</Tabs.Trigger>
            <Tabs.Trigger value="appointments" className={TAB_TRIGGER}>Appointments</Tabs.Trigger>
            <Tabs.Trigger value="messages" className={TAB_TRIGGER}>Messages</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="timeline">
            {!timeline ? (
              <LoadingState />
            ) : timeline.length === 0 ? (
              <EmptyState title="Nothing to show yet" description="As your matter progresses, updates will appear here in plain language." />
            ) : (
              <ol className="space-y-4 border-l-2 border-ink-100 pl-4">
                {timeline.map((event, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brass-500" />
                    <p className="text-xs text-ink-400"><DateDisplay value={event.date} opts={{ dateStyle: "medium" }} /></p>
                    <p className="text-sm text-ink-800">{event.label}</p>
                  </li>
                ))}
              </ol>
            )}
          </Tabs.Content>

          <Tabs.Content value="matters">
            {matters.isLoading ? <LoadingState /> : matters.isError ? <ErrorState message="Unable to load your matters." /> : !matters.data?.length ? (
              <EmptyState title="No matters yet" />
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
              <EmptyState title="No documents shared yet" />
            ) : (
              <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-surface-raised">
                {documents.data.map((d) => (
                  <li key={d.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-ink-800">{d.name}</span>
                    <button
                      className="text-brass-600 hover:underline"
                      onClick={async () => window.open(await getSignedDocumentUrl(d.storage_path), "_blank", "noopener,noreferrer")}
                    >
                      Download
                    </button>
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
                    <div className="flex items-center gap-3"><CurrencyDisplay amount={q.total} currency={q.currency} /><StatusBadge status={q.status} /></div>
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
                      <CurrencyDisplay amount={inv.total - inv.amount_paid} currency={inv.currency} />
                      <StatusBadge status={inv.status} />
                    </div>
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

          <Tabs.Content value="messages">
            <Card>
              <CardContent className="flex h-96 flex-col py-4">
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {messages.isLoading ? <LoadingState /> : (messages.data ?? []).map((m) => (
                    <div key={m.id} className="max-w-[80%] rounded-lg bg-ink-50 px-3 py-2 text-sm">
                      <p className="text-ink-800">{m.body}</p>
                      <p className="mt-1 text-xs text-ink-400">{formatDate(m.created_at, { dateStyle: "short", timeStyle: "short" })}</p>
                    </div>
                  ))}
                  {!messages.isLoading && (messages.data ?? []).length === 0 && <EmptyState title="No messages yet" />}
                </div>
                <div className="mt-3 flex gap-2">
                  <textarea
                    className="h-16 flex-1 resize-none rounded-md border border-ink-200 bg-surface-raised px-3 py-2 text-sm"
                    placeholder="Message your firm…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <Button
                    disabled={!draft.trim() || sendMessage.isPending}
                    onClick={async () => {
                      await sendMessage.mutateAsync({ body: draft.trim(), clientId: client.id });
                      setDraft("");
                    }}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Tabs.Content>
        </Tabs.Root>
      </main>
    </div>
  );
}
