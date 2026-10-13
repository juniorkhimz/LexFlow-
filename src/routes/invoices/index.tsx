import { useDocumentTitle } from "@/hooks/use-document-title";
import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { CurrencyDisplay, DateDisplay } from "@/components/ui/display";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { LineItemEditor, emptyLineItem, type LineItemDraft } from "@/components/ui/line-item-editor";
import { useClientOptions } from "@/lib/queries/clients";
import { useInvoices, useCreateInvoice, INVOICE_STATUSES } from "@/lib/queries/invoices";
import type { Invoice, InvoiceStatus } from "@/types/database";

function NewInvoiceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createInvoice = useCreateInvoice();
  const { data: clients } = useClientOptions();
  const [clientId, setClientId] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [items, setItems] = React.useState<LineItemDraft[]>([emptyLineItem()]);
  const [error, setError] = React.useState<string | null>(null);

  const reset = () => {
    setClientId(""); setDueDate(""); setNotes(""); setItems([emptyLineItem()]); setError(null);
  };

  const submit = async () => {
    setError(null);
    if (!clientId) { setError("Select a client."); return; }
    const validItems = items.filter((i) => i.description.trim().length > 0);
    if (validItems.length === 0) { setError("Add at least one line item."); return; }
    try {
      await createInvoice.mutateAsync({ client_id: clientId, due_date: dueDate || null, notes, items: validItems });
      reset();
      onOpenChange(false);
    } catch {
      setError("Failed to create invoice. Please try again.");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink-950/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-surface-raised p-5 shadow-xl">
          <Dialog.Title className="font-display text-lg font-semibold text-ink-900">New invoice</Dialog.Title>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="client_id">Client</Label>
                <select id="client_id" className="h-9 w-full rounded-md border border-ink-200 bg-surface-raised px-3 text-sm" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">Select a client…</option>
                  {clients?.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="due_date">Due date</Label>
                <Input id="due_date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Line items</Label>
              <LineItemEditor items={items} onChange={setItems} />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="button" onClick={submit} disabled={createInvoice.isPending}>{createInvoice.isPending ? "Creating…" : "Create invoice"}</Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function InvoicesIndexPage() {
  useDocumentTitle("Invoices");
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<InvoiceStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { page, setPage, from, to } = usePagination();
  const { data, isLoading, isError, refetch } = useInvoices({ search: search || undefined, status, from, to });

  React.useEffect(() => setPage(0), [search, status]);

  const columns: DataTableColumn<Invoice & { clients: { full_name: string } | null }>[] = [
    { key: "invoice_number", header: "Invoice #", render: (inv) => <span className="font-medium text-ink-900">{inv.invoice_number}</span> },
    { key: "client", header: "Client", render: (inv) => inv.clients?.full_name ?? "—" },
    { key: "status", header: "Status", render: (inv) => <StatusBadge status={inv.status} /> },
    { key: "total", header: "Total", render: (inv) => <CurrencyDisplay amount={inv.total} currency={inv.currency} /> },
    { key: "balance", header: "Balance", render: (inv) => <CurrencyDisplay amount={inv.total - inv.amount_paid} currency={inv.currency} /> },
    { key: "due_date", header: "Due", render: (inv) => <DateDisplay value={inv.due_date} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Invoicing, payments, and outstanding balances."
        actions={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New invoice</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput className="max-w-xs" placeholder="Search invoice #…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="h-9 rounded-md border border-ink-200 bg-surface-raised px-3 text-sm text-ink-800" value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus | "all")}>
          <option value="all">All statuses</option>
          {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading invoices…" />
      ) : isError ? (
        <ErrorState message="Unable to load invoices." onRetry={() => refetch()} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState
          title={search || status !== "all" ? "No invoices match your filters" : "No invoices yet"}
          description="Create one directly, or convert an accepted quote from the Quotes module."
          action={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New invoice</Button>}
        />
      ) : (
        <>
          <DataTable columns={columns} rows={data.rows} onRowClick={(inv) => navigate({ to: `/invoices/${inv.id}` })} />
          <Pagination page={page} onPageChange={setPage} count={data.count} rowCount={data.rows.length} />
        </>
      )}

      <NewInvoiceDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
