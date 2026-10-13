import * as React from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CurrencyDisplay, DateDisplay } from "@/components/ui/display";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input, Label } from "@/components/ui/input";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/states";
import {
  useInvoice, useUpdateInvoiceStatus, useDeleteInvoice, useRecordPayment, INVOICE_STATUSES, PAYMENT_METHODS,
} from "@/lib/queries/invoices";
import type { InvoiceStatus, PaymentMethod } from "@/types/database";

function RecordPaymentDialog({ open, onOpenChange, invoiceId, balance, currency }: {
  open: boolean; onOpenChange: (v: boolean) => void; invoiceId: string; balance: number; currency: string;
}) {
  const recordPayment = useRecordPayment(invoiceId);
  const [amount, setAmount] = React.useState(balance);
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = React.useState<PaymentMethod>("mpesa");
  const [reference, setReference] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (amount <= 0) { setError("Amount must be greater than zero."); return; }
    try {
      await recordPayment.mutateAsync({ amount, payment_date: date, method, reference });
      onOpenChange(false);
    } catch {
      setError("Failed to record payment. Please try again.");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink-950/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface-raised p-5 shadow-xl">
          <Dialog.Title className="font-display text-lg font-semibold text-ink-900">Record payment</Dialog.Title>
          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="amount">Amount ({currency})</Label>
              <Input id="amount" type="number" step="0.01" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="method">Method</Label>
                <select id="method" className="h-9 w-full rounded-md border border-ink-200 bg-surface-raised px-3 text-sm" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m === "mpesa" ? "M-Pesa" : m.replace("_", " ")}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="reference">Reference</Label>
              <Input id="reference" placeholder="Transaction code, cheque #…" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="button" onClick={submit} disabled={recordPayment.isPending}>{recordPayment.isPending ? "Recording…" : "Record payment"}</Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams({ strict: false }) as { invoiceId: string };
  const navigate = useNavigate();
  const { data: invoice, isLoading, isError, refetch } = useInvoice(invoiceId);
  const updateStatus = useUpdateInvoiceStatus(invoiceId);
  const deleteInvoice = useDeleteInvoice();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [paymentOpen, setPaymentOpen] = React.useState(false);

  if (isLoading) return <LoadingState label="Loading invoice…" />;
  if (isError || !invoice) return <ErrorState message="Unable to load this invoice." onRetry={() => refetch()} />;

  const balance = invoice.total - invoice.amount_paid;

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/invoices" })} className="mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to invoices
      </Button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">{invoice.invoice_number}</h1>
          <p className="text-sm text-ink-500">{invoice.clients?.full_name ?? "—"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-md border border-ink-200 bg-surface-raised px-2 text-sm"
            value={invoice.status}
            onChange={(e) => updateStatus.mutate(e.target.value as InvoiceStatus)}
          >
            {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
          {balance > 0 && (
            <Button size="sm" onClick={() => setPaymentOpen(true)}><Plus className="h-4 w-4" /> Record payment</Button>
          )}
          <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Line items</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-xs uppercase text-ink-400">
                    <th className="py-2">Description</th><th className="py-2">Qty</th><th className="py-2">Unit price</th><th className="py-2">Tax</th><th className="py-2">Discount</th><th className="py-2 text-right">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.invoice_items.map((item) => (
                    <tr key={item.id} className="border-b border-ink-50">
                      <td className="py-2 text-ink-800">{item.description}</td>
                      <td className="py-2 text-ink-600">{item.quantity}</td>
                      <td className="py-2 text-ink-600"><CurrencyDisplay amount={item.unit_price} currency={invoice.currency} /></td>
                      <td className="py-2 text-ink-600">{item.tax_rate}%</td>
                      <td className="py-2 text-ink-600"><CurrencyDisplay amount={item.discount} currency={invoice.currency} /></td>
                      <td className="py-2 text-right text-ink-800"><CurrencyDisplay amount={item.line_total} currency={invoice.currency} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex flex-col items-end gap-1 text-sm">
                <div className="flex w-52 justify-between text-ink-600"><span>Subtotal</span><CurrencyDisplay amount={invoice.subtotal} currency={invoice.currency} /></div>
                <div className="flex w-52 justify-between text-ink-600"><span>Tax</span><CurrencyDisplay amount={invoice.tax_amount} currency={invoice.currency} /></div>
                <div className="flex w-52 justify-between text-ink-600"><span>Discount</span><CurrencyDisplay amount={-invoice.discount_amount} currency={invoice.currency} /></div>
                <div className="flex w-52 justify-between border-t border-ink-100 pt-1 font-medium text-ink-900"><span>Total</span><CurrencyDisplay amount={invoice.total} currency={invoice.currency} /></div>
                <div className="flex w-52 justify-between text-success"><span>Paid</span><CurrencyDisplay amount={invoice.amount_paid} currency={invoice.currency} /></div>
                <div className="flex w-52 justify-between font-medium text-danger"><span>Balance</span><CurrencyDisplay amount={balance} currency={invoice.currency} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
            <CardContent>
              {invoice.payments.length === 0 ? (
                <EmptyState title="No payments recorded yet" />
              ) : (
                <ul className="divide-y divide-ink-100">
                  {invoice.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <CurrencyDisplay amount={p.amount} currency={invoice.currency} />
                        <span className="ml-2 text-xs uppercase text-ink-400">{p.method === "mpesa" ? "M-Pesa" : p.method.replace("_", " ")}</span>
                        {p.reference && <span className="ml-2 text-xs text-ink-400">Ref: {p.reference}</span>}
                      </div>
                      <DateDisplay value={p.payment_date} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><p className="text-xs uppercase text-ink-400">Status</p><StatusBadge status={invoice.status} className="mt-1" /></div>
            <div><p className="text-xs uppercase text-ink-400">Due date</p><p className="mt-1 text-ink-800"><DateDisplay value={invoice.due_date} /></p></div>
            <div><p className="text-xs uppercase text-ink-400">Created</p><p className="mt-1 text-ink-800"><DateDisplay value={invoice.created_at} /></p></div>
            {invoice.notes && <div><p className="text-xs uppercase text-ink-400">Notes</p><p className="mt-1 whitespace-pre-wrap text-ink-800">{invoice.notes}</p></div>}
          </CardContent>
        </Card>
      </div>

      <RecordPaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} invoiceId={invoice.id} balance={balance} currency={invoice.currency} />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this invoice?"
        description="This cannot be undone and will delete its recorded payments."
        confirmLabel="Delete"
        destructive
        loading={deleteInvoice.isPending}
        onConfirm={async () => {
          await deleteInvoice.mutateAsync(invoice.id);
          navigate({ to: "/invoices" });
        }}
      />
    </div>
  );
}
