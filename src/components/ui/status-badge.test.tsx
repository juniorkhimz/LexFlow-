import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders the status as a human-readable, title-cased label", () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("renders a single-word status correctly", () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("falls back to a neutral tone for an unmapped status rather than crashing", () => {
    // Guards against a real risk: a new status value gets added to a
    // Postgres enum (e.g. a new invoice status) but someone forgets to add
    // it to TONE_MAP in this file — should degrade gracefully, not throw.
    render(<StatusBadge status="some_future_status_not_in_the_map" />);
    expect(screen.getByText("Some Future Status Not In The Map")).toBeInTheDocument();
  });

  it("applies an additional className when provided", () => {
    render(<StatusBadge status="active" className="custom-test-class" />);
    expect(screen.getByText("Active")).toHaveClass("custom-test-class");
  });
});
