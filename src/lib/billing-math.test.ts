import { describe, it, expect } from "vitest";
import { calculateLineTotal, calculateItemsTotal } from "./billing-math";

describe("calculateLineTotal", () => {
  it("computes quantity × unit price with no tax or discount", () => {
    expect(calculateLineTotal({ quantity: 2, unit_price: 100, tax_rate: 0, discount: 0 })).toBe(200);
  });

  it("applies tax as a percentage of the subtotal", () => {
    // 2 * 100 = 200 subtotal, 16% tax = 32, total 232
    expect(calculateLineTotal({ quantity: 2, unit_price: 100, tax_rate: 16, discount: 0 })).toBeCloseTo(232);
  });

  it("subtracts a flat discount after tax", () => {
    // 200 subtotal + 16% tax (32) - 20 discount = 212
    expect(calculateLineTotal({ quantity: 2, unit_price: 100, tax_rate: 16, discount: 20 })).toBeCloseTo(212);
  });

  it("handles a zero quantity line (e.g. a placeholder row)", () => {
    expect(calculateLineTotal({ quantity: 0, unit_price: 500, tax_rate: 16, discount: 0 })).toBe(0);
  });

  it("handles fractional quantities (e.g. hours billed)", () => {
    expect(calculateLineTotal({ quantity: 1.5, unit_price: 8500, tax_rate: 0, discount: 0 })).toBeCloseTo(12750);
  });

  // This mirrors set_line_total() in supabase/migrations/0005_billing_triggers.sql
  // exactly — if that SQL function's formula ever changes, this test (and
  // the one above) should be the first thing that catches the drift.
  it("matches the documented formula: quantity * unit_price * (1 + tax_rate/100) - discount", () => {
    const item = { quantity: 3, unit_price: 45000, tax_rate: 16, discount: 5000 };
    const expected = item.quantity * item.unit_price * (1 + item.tax_rate / 100) - item.discount;
    expect(calculateLineTotal(item)).toBeCloseTo(expected);
  });
});

describe("calculateItemsTotal", () => {
  it("sums multiple line items", () => {
    const items = [
      { quantity: 1, unit_price: 100, tax_rate: 0, discount: 0 },
      { quantity: 2, unit_price: 50, tax_rate: 0, discount: 0 },
    ];
    expect(calculateItemsTotal(items)).toBe(200);
  });

  it("returns 0 for an empty list", () => {
    expect(calculateItemsTotal([])).toBe(0);
  });
});
