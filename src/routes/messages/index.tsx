import { useDocumentTitle } from "@/hooks/use-document-title";
import * as React from "react";
import { Send, Plus } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { formatDate } from "@/lib/utils";
import { useClientOptions } from "@/lib/queries/clients";
import { useConversations, useThreadMessages, useSendMessage } from "@/lib/queries/messages";

function NewConversationDialog({ open, onOpenChange, onStart }: {
  open: boolean; onOpenChange: (v: boolean) => void; onStart: (clientId: string, label: string) => void;
}) {
  const { data: clients } = useClientOptions();
  const [clientId, setClientId] = React.useState("");

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink-950/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface-raised p-5 shadow-xl">
          <Dialog.Title className="font-display text-lg font-semibold text-ink-900">Start conversation</Dialog.Title>
          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="client_id">Client</Label>
              <select id="client_id" className="h-9 w-full rounded-md border border-ink-200 bg-surface-raised px-3 text-sm" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Select a client…</option>
                {clients?.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                type="button"
                disabled={!clientId}
                onClick={() => {
                  const client = clients?.find((c) => c.id === clientId);
                  if (client) onStart(client.id, client.full_name);
                  onOpenChange(false);
                }}
              >
                Start
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function MessagesPage() {
  useDocumentTitle("Messages");
  const { data: conversations, isLoading, isError, refetch } = useConversations();
  const [active, setActive] = React.useState<{ clientId: string | null; matterId: string | null; label: string } | null>(null);
  const thread = useThreadMessages(active?.clientId ?? null, active?.matterId ?? null);
  const sendMessage = useSendMessage();
  const [draft, setDraft] = React.useState("");
  const [newConvoOpen, setNewConvoOpen] = React.useState(false);

  const send = async () => {
    if (!active || !draft.trim()) return;
    await sendMessage.mutateAsync({ body: draft.trim(), clientId: active.clientId, matterId: active.matterId });
    setDraft("");
  };

  return (
    <div>
      <PageHeader
        title="Messages"
        description="Internal notes and client-linked conversations."
        actions={<Button size="sm" onClick={() => setNewConvoOpen(true)}><Plus className="h-4 w-4" /> New conversation</Button>}
      />

      {isLoading ? (
        <LoadingState label="Loading conversations…" />
      ) : isError ? (
        <ErrorState message="Unable to load messages." onRetry={() => refetch()} />
      ) : !conversations || conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description="Start a conversation with a client. The client-portal messaging surface reuses this same thread."
          action={<Button size="sm" onClick={() => setNewConvoOpen(true)}><Plus className="h-4 w-4" /> New conversation</Button>}
        />
      ) : (
        <div className="grid gap-4 rounded-lg border border-ink-200 bg-surface-raised md:grid-cols-[240px_1fr]">
          <div className="divide-y divide-ink-100 border-b border-ink-100 md:border-b-0 md:border-r">
            {conversations.map((c) => (
              <button
                key={c.key}
                onClick={() => setActive({ clientId: c.clientId, matterId: c.matterId, label: c.label })}
                className={`block w-full px-3 py-2.5 text-left text-sm hover:bg-ink-50 ${active?.label === c.label ? "bg-ink-50 font-medium" : ""}`}
              >
                <p className="truncate text-ink-900">{c.label}</p>
                <p className="truncate text-xs text-ink-400">{c.lastMessage}</p>
              </button>
            ))}
          </div>

          <div className="flex min-h-[360px] flex-col p-4">
            {!active ? (
              <div className="flex flex-1 items-center justify-center text-sm text-ink-400">Select a conversation</div>
            ) : (
              <>
                <p className="mb-3 font-medium text-ink-900">{active.label}</p>
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {thread.isLoading ? (
                    <LoadingState />
                  ) : (
                    (thread.data ?? []).map((m) => (
                      <div key={m.id} className="max-w-[80%] rounded-lg bg-ink-50 px-3 py-2 text-sm">
                        <p className="text-ink-800">{m.body}</p>
                        <p className="mt-1 text-xs text-ink-400">{m.profiles?.full_name ?? "—"} · {formatDate(m.created_at, { dateStyle: "short", timeStyle: "short" })}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <textarea
                    className="h-16 flex-1 resize-none rounded-md border border-ink-200 bg-surface-raised px-3 py-2 text-sm"
                    placeholder="Write a message…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <Button onClick={send} disabled={sendMessage.isPending || !draft.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <NewConversationDialog
        open={newConvoOpen}
        onOpenChange={setNewConvoOpen}
        onStart={(clientId, label) => setActive({ clientId, matterId: null, label })}
      />
    </div>
  );
}
