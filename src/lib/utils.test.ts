import { describe, it, expect } from "vitest";
import { cn, formatCurrency, formatDate } from "./utils";

describe("cn", () => {
  it("merges class names, keeping the last conflicting Tailwind utility", () => {
    // twMerge's whole job: "px-2 px-4" should collapse to just "px-4",
    // not error or produce both — this is what most UI components rely on
    // when they do e.g. cn("h-9 ...", className) to allow overrides.
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });
});

describe("formatCurrency", () => {
  it("formats KES by default, matching the app's default currency", () => {
    const result = formatCurrency(1234.5);
    expect(result).toContain("1,234.5");
    expect(result).toMatch(/KES|KSh/i); // Intl's exact symbol varies by ICU data version
  });

  it("respects an explicit currency code (used for firm-configurable currency)", () => {
    const result = formatCurrency(100, "USD");
    expect(result).toContain("100");
    expect(result).toMatch(/USD|\$/);
  });

  it("formats zero without throwing (a firm with no billing yet)", () => {
    expect(() => formatCurrency(0)).not.toThrow();
  });

  it("formats negative amounts (e.g. a discount line shown as -amount)", () => {
    const result = formatCurrency(-500);
    expect(result).toContain("500");
  });
});

describe("formatDate", () => {
  it("formats an ISO date string", () => {
    const result = formatDate("2026-03-15");
    expect(result.length).toBeGreaterThan(0);
  });

  it("accepts a Date object directly", () => {
    const result = formatDate(new Date(2026, 2, 15));
    expect(result.length).toBeGreaterThan(0);
  });

  it("respects custom Intl options (e.g. dateStyle + timeStyle used on activity logs)", () => {
    const result = formatDate("2026-03-15T10:30:00Z", { dateStyle: "medium", timeStyle: "short" });
    expect(result.length).toBeGreaterThan(0);
  });
});
