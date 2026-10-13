import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, Textarea } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyDisplay, DateDisplay } from "@/components/ui/display";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useClientOptions } from "@/lib/queries/clients";
import { useMatterOptions } from "@/lib/queries/matters";
import {
  useTrustBalances, useClientTrustBalance, useTrustTransactions, useRecordTrustTransaction,
} from "@/lib/queries/trust-accounts";
import type { TrustTransactionType } from "@/types/database";

const schema = z.object({
  clientId: z.string().min(1, "Select a client."),
  matterId: z.string().optional(),
  type: z.enum(["deposit", "disbursement", "transfer_to_operating"]),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  description: z.string().optional(),
  reference: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const TYPE_LABELS: Record<TrustTransactionType, string> = {
  deposit: "Deposit",
  disbursement: "Disbursement",
  transfer_to_operating: "Transfer to operating account",
};

function RecordTransactionDialog({ open, onOpenChange, defaultClientId }: {
  open: boolean; onOpenChange: (v: boolean) => void; defaultClientId?: string;
}) {
  const record = useRecordTrustTransaction();
  const { data: clients } = useClientOptions();
  const { data: matters } = useMatterOptions();
  const {
    register, handleSubmit, reset, watch, formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "deposit", clientId: defaultClientId ?? "" },
  });
  const [serverError, setServerError] = React.useState<string | null>(null);
  const watchedClientId = watch("clientId");
  const { data: currentBalance } = useClientTrustBalance(watchedClientId || undefined);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await record.mutateAsync({
        clientId: values.clientId,
        matterId: values.matterId || null,
        type: values.type,
        amount: values.amount,
        description: values.description,
        reference: values.reference,
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      // The database trigger is what actually enforces "can't withdraw more
      // than this client has in trust" — its error message surfaces here
      // verbatim, which is intentionally specific ("has X, tried to
      // withdraw Y") rather than a generic failure message.
      setServerError(err instanceof Error ? err.message : "Failed to record transaction.");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink-950/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[90vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-surface-raised p-5 shadow-xl">
          <Dialog.Title className="font-display text-lg font-semibold text-ink-900">Record trust transaction</Dialog.Title>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
            <div>
              <Label htmlFor="clientId">Client</Label>
              <select id="clientId" className="h-9 w-full rounded-md border border-ink-200 bg-surface-raised px-3 text-sm" {...register("clientId")}>
                <option value="">Select a client…</option>
                {clients?.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
              <FieldError message={errors.clientId?.message} />
              {watchedClientId && currentBalance != null && (
                <p className="mt-1 text-xs text-ink-500">
                  Current trust balance: <CurrencyDisplay amount={currentBalance} />
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="type">Type</Label>
                <select id="type" className="h-9 w-full rounded-md border border-ink-200 bg-surface-raised px-3 text-sm" {...register("type")}>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="amount">Amount (KES)</Label>
                <Input id="amount" type="number" step="0.01" min={0} {...register("amount")} />
                <FieldError message={errors.amount?.message} />
              </div>
            </div>
            <div>
              <Label htmlFor="matterId">Matter (optional)</Label>
              <select id="matterId" className="h-9 w-full rounded-md border border-ink-200 bg-surface-raised px-3 text-sm" {...register("matterId")}>
                <option value="">None</option>
                {matters?.map((m) => <option key={m.id} value={m.id}>{m.matter_name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="reference">Reference</Label>
              <Input id="reference" placeholder="Cheque #, M-Pesa code…" {...register("reference")} />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={2} {...register("description")} />
            </div>
            {serverError && <p className="text-sm text-danger">{serverError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Recording…" : "Record"}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ClientLedger({ clientId }: { clientId: string }) {
  const { data: transactions, isLoading } = useTrustTransactions(clientId);
  if (isLoading) return <LoadingState label="Loading ledger…" />;
  if (!transactions || transactions.length === 0) return <EmptyState title="No transactions yet" />;

  return (
    <ul className="divide-y divide-ink-100">
      {transactions.map((t) => (
        <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
          <div className="flex items-center gap-2">
            {t.type === "deposit" ? (
              <ArrowDownCircle className="h-4 w-4 shrink-0 text-success" />
            ) : (
              <ArrowUpCircle className="h-4 w-4 shrink-0 text-danger" />
            )}
            <div>
              <p className="text-ink-800">{TYPE_LABELS[t.type]}{t.matters?.matter_name ? ` · ${t.matters.matter_name}` : ""}</p>
              <p className="text-xs text-ink-400">
                <DateDisplay value={t.created_at} opts={{ dateStyle: "medium" }} />
                {t.reference ? ` · Ref: ${t.reference}` : ""}
              </p>
            </div>
          </div>
          <span className={t.type === "deposit" ? "text-success" : "text-danger"}>
            {t.type === "deposit" ? "+" : "−"}<CurrencyDisplay amount={t.amount} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function TrustAccountsPage() {
  useDocumentTitle("Trust Accounts");
  const { data: balances, isLoading, isError, refetch } = useTrustBalances();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [expandedClientId, setExpandedClientId] = React.useState<string | null>(null);

  const totalHeld = (balances ?? []).reduce((sum, b) => sum + b.balance, 0);

  return (
    <div>
      <PageHeader
        title="Trust Accounts"
        description="Client funds held in trust, tracked separately from firm operating funds — a client's balance can never go negative."
        actions={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> Record transaction</Button>}
      />

      <Card className="mb-4">
        <CardContent className="py-4">
          <p className="text-xs uppercase text-ink-400">Total held in trust</p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink-900"><CurrencyDisplay amount={totalHeld} /></p>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingState label="Loading trust balances…" />
      ) : isError ? (
        <ErrorState message="Unable to load trust accounts." onRetry={() => refetch()} />
      ) : !balances || balances.length === 0 ? (
        <EmptyState
          title="No trust funds held"
          description="Deposits recorded for a client will appear here as a running balance."
          action={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> Record transaction</Button>}
        />
      ) : (
        <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-surface-raised">
          {balances.map((b) => (
            <li key={b.id}>
              <button
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-ink-50"
                onClick={() => setExpandedClientId(expandedClientId === b.id ? null : b.id)}
              >
                <div>
                  <p className="font-medium text-ink-900">{b.full_name}</p>
                  {b.organization && <p className="text-xs text-ink-400">{b.organization}</p>}
                </div>
                <CurrencyDisplay amount={b.balance} />
              </button>
              {expandedClientId === b.id && (
                <div className="border-t border-ink-100 bg-ink-50/40 px-4 py-2">
                  <ClientLedger clientId={b.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <RecordTransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
