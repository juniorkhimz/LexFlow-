import * as React from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Copy, Trash2, FileOutput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CurrencyDisplay, DateDisplay } from "@/components/ui/display";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingState, ErrorState } from "@/components/ui/states";
import {
  useQuote, useUpdateQuoteStatus, useDeleteQuote, useDuplicateQuote, useConvertQuoteToInvoice, QUOTE_STATUSES,
} from "@/lib/queries/quotes";
import type { QuoteStatus } from "@/types/database";

export default function QuoteDetailPage() {
  const { quoteId } = useParams({ strict: false }) as { quoteId: string };
  const navigate = useNavigate();
  const { data: quote, isLoading, isError, refetch } = useQuote(quoteId);
  const updateStatus = useUpdateQuoteStatus(quoteId);
  const deleteQuote = useDeleteQuote();
  const duplicateQuote = useDuplicateQuote();
  const convertToInvoice = useConvertQuoteToInvoice();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [confirmConvert, setConfirmConvert] = React.useState(false);

  if (isLoading) return <LoadingState label="Loading quote…" />;
  if (isError || !quote) return <ErrorState message="Unable to load this quote." onRetry={() => refetch()} />;

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/quotes" })} className="mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to quotes
      </Button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">{quote.quote_number}</h1>
          <p className="text-sm text-ink-500">{quote.clients?.full_name ?? "—"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-md border border-ink-200 bg-surface-raised px-2 text-sm"
            value={quote.status}
            onChange={(e) => updateStatus.mutate(e.target.value as QuoteStatus)}
          >
            {QUOTE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={() => duplicateQuote.mutate(quote.id, { onSuccess: (copy) => navigate({ to: `/quotes/${copy.id}` }) })}>
            <Copy className="h-4 w-4" /> Duplicate
          </Button>
          {quote.status === "accepted" && (
            <Button size="sm" onClick={() => setConfirmConvert(true)}>
              <FileOutput className="h-4 w-4" /> Convert to invoice
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
            <CardHeader><CardTitle>Line items</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-xs uppercase text-ink-400">
                    <th className="py-2">Description</th><th className="py-2">Qty</th><th className="py-2">Unit price</th><th className="py-2">Tax</th><th className="py-2">Discount</th><th className="py-2 text-right">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.quote_items.map((item) => (
                    <tr key={item.id} className="border-b border-ink-50">
                      <td className="py-2 text-ink-800">{item.description}</td>
                      <td className="py-2 text-ink-600">{item.quantity}</td>
                      <td className="py-2 text-ink-600"><CurrencyDisplay amount={item.unit_price} currency={quote.currency} /></td>
                      <td className="py-2 text-ink-600">{item.tax_rate}%</td>
                      <td className="py-2 text-ink-600"><CurrencyDisplay amount={item.discount} currency={quote.currency} /></td>
                      <td className="py-2 text-right text-ink-800"><CurrencyDisplay amount={item.line_total} currency={quote.currency} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex flex-col items-end gap-1 text-sm">
                <div className="flex w-48 justify-between text-ink-600"><span>Subtotal</span><CurrencyDisplay amount={quote.subtotal} currency={quote.currency} /></div>
                <div className="flex w-48 justify-between text-ink-600"><span>Tax</span><CurrencyDisplay amount={quote.tax_amount} currency={quote.currency} /></div>
                <div className="flex w-48 justify-between text-ink-600"><span>Discount</span><CurrencyDisplay amount={-quote.discount_amount} currency={quote.currency} /></div>
                <div className="flex w-48 justify-between border-t border-ink-100 pt-1 font-medium text-ink-900"><span>Total</span><CurrencyDisplay amount={quote.total} currency={quote.currency} /></div>
              </div>
            </CardContent>
          </Card>
          {quote.notes && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm text-ink-800">{quote.notes}</CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><p className="text-xs uppercase text-ink-400">Status</p><StatusBadge status={quote.status} className="mt-1" /></div>
            <div><p className="text-xs uppercase text-ink-400">Valid until</p><p className="mt-1 text-ink-800"><DateDisplay value={quote.valid_until} /></p></div>
            <div><p className="text-xs uppercase text-ink-400">Created</p><p className="mt-1 text-ink-800"><DateDisplay value={quote.created_at} /></p></div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmConvert}
        onOpenChange={setConfirmConvert}
        title="Convert this quote to an invoice?"
        description="Creates a new draft invoice with the same line items, linked back to this quote."
        confirmLabel="Convert"
        loading={convertToInvoice.isPending}
        onConfirm={async () => {
          const invoiceId = await convertToInvoice.mutateAsync(quote.id);
          setConfirmConvert(false);
          navigate({ to: `/invoices/${invoiceId}` });
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this quote?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteQuote.isPending}
        onConfirm={async () => {
          await deleteQuote.mutateAsync(quote.id);
          navigate({ to: "/quotes" });
        }}
      />
    </div>
  );
}
