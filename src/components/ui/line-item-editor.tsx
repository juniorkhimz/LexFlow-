import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { calculateLineTotal, calculateItemsTotal } from "@/lib/billing-math";

export interface LineItemDraft {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount: number;
}

export const emptyLineItem = (): LineItemDraft => ({ description: "", quantity: 1, unit_price: 0, tax_rate: 0, discount: 0 });

// Client-side totals here are for display only, so the person building the
// quote/invoice sees running numbers as they type — the authoritative total
// is always recomputed server-side by Postgres triggers on save
// (see supabase/migrations/0005_billing_triggers.sql), never trusted from here.
export function LineItemEditor({
  items,
  onChange,
  currency = "KES",
}: {
  items: LineItemDraft[];
  onChange: (items: LineItemDraft[]) => void;
  currency?: string;
}) {
  const update = (i: number, patch: Partial<LineItemDraft>) => {
    const next = items.slice();
    next[i] = { ...next[i], ...patch } as LineItemDraft;
    onChange(next);
  };
  const total = calculateItemsTotal(items);

  return (
    <div className="space-y-2">
      <div className="hidden grid-cols-[1fr_70px_90px_70px_80px_90px_32px] gap-2 px-1 text-xs font-medium uppercase text-ink-400 sm:grid">
        <span>Description</span><span>Qty</span><span>Unit price</span><span>Tax %</span><span>Discount</span><span>Line total</span><span />
      </div>
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 rounded-md border border-ink-100 p-2 sm:grid-cols-[1fr_70px_90px_70px_80px_90px_32px] sm:border-0 sm:p-0">
          <Input className="col-span-2 sm:col-span-1" placeholder="Description" value={item.description} onChange={(e) => update(i, { description: e.target.value })} />
          <Input type="number" min={0} step="1" value={item.quantity} onChange={(e) => update(i, { quantity: Number(e.target.value) })} />
          <Input type="number" min={0} step="0.01" value={item.unit_price} onChange={(e) => update(i, { unit_price: Number(e.target.value) })} />
          <Input type="number" min={0} step="0.01" value={item.tax_rate} onChange={(e) => update(i, { tax_rate: Number(e.target.value) })} />
          <Input type="number" min={0} step="0.01" value={item.discount} onChange={(e) => update(i, { discount: Number(e.target.value) })} />
          <div className="flex items-center text-sm text-ink-700">{formatCurrency(calculateLineTotal(item), currency)}</div>
          <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="flex items-center justify-center text-ink-400 hover:text-danger" aria-label="Remove line">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, emptyLineItem()])}>
        <Plus className="h-4 w-4" /> Add line item
      </Button>
      <div className="flex justify-end pt-1 text-sm font-medium text-ink-900">Total (approx.): {formatCurrency(total, currency)}</div>
    </div>
  );
}
