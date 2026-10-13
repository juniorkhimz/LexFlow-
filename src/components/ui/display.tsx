import { formatCurrency, formatDate } from "@/lib/utils";

export function CurrencyDisplay({ amount, currency = "KES" }: { amount: number; currency?: string }) {
  return <span className="tabular-nums">{formatCurrency(amount, currency)}</span>;
}

export function DateDisplay({ value, opts }: { value: string | null; opts?: Intl.DateTimeFormatOptions }) {
  if (!value) return <span className="text-ink-400">—</span>;
  return <span>{formatDate(value, opts)}</span>;
}
