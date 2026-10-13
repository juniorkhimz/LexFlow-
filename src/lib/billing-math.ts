// Client-side preview math only — the authoritative total is always
// recomputed server-side by Postgres triggers on save (see
// supabase/migrations/0005_billing_triggers.sql, set_line_total()). This
// exists so the person building a quote/invoice sees a running total as
// they type, and so that logic is actually testable (see
// billing-math.test.ts) — it was previously an unexported function inside
// line-item-editor.tsx with no test coverage at all.
//
// IMPORTANT: if you change the formula here, change it in
// set_line_total() in 0005_billing_triggers.sql too — these two must stay
// in sync, same documented tradeoff as billing-plans.ts / plan_limits /
// subscriptions.plan noted in the Plan-based feature gating README section.

export interface LineItemLike {
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount: number;
}

export function calculateLineTotal(item: LineItemLike): number {
  return item.quantity * item.unit_price * (1 + item.tax_rate / 100) - item.discount;
}

export function calculateItemsTotal(items: LineItemLike[]): number {
  return items.reduce((sum, item) => sum + calculateLineTotal(item), 0);
}
