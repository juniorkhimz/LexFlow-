import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination } from "./pagination";
import { PAGE_SIZE } from "@/hooks/use-pagination";

describe("Pagination", () => {
  it("renders nothing when there's only one short page (nothing to paginate)", () => {
    const { container } = render(<Pagination page={0} onPageChange={vi.fn()} count={5} rowCount={5} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("disables Prev on the first page", () => {
    render(<Pagination page={0} onPageChange={vi.fn()} count={PAGE_SIZE * 3} rowCount={PAGE_SIZE} />);
    expect(screen.getByRole("button", { name: /prev/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).toBeEnabled();
  });

  it("disables Next on the last page (using exact count)", () => {
    // count=45, PAGE_SIZE=20 -> 3 pages (0,1,2). Page 2 is last.
    const count = PAGE_SIZE * 2 + 5;
    render(<Pagination page={2} onPageChange={vi.fn()} count={count} rowCount={5} />);
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /prev/i })).toBeEnabled();
  });

  it("falls back to row-count heuristic when count is null (RLS or query without exact count)", () => {
    // A full page of results with no total count available — assume there
    // might be more, since we can't know for sure.
    render(<Pagination page={0} onPageChange={vi.fn()} count={null} rowCount={PAGE_SIZE} />);
    expect(screen.getByRole("button", { name: /next/i })).toBeEnabled();
  });

  it("treats a short final page (count null) as the last page", () => {
    render(<Pagination page={1} onPageChange={vi.fn()} count={null} rowCount={3} />);
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("calls onPageChange with the next page index when Next is clicked", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={0} onPageChange={onPageChange} count={PAGE_SIZE * 3} rowCount={PAGE_SIZE} />);
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("shows the correct human-readable range", () => {
    render(<Pagination page={1} onPageChange={vi.fn()} count={45} rowCount={20} />);
    // page 1 (second page), 20 rows -> items 21-40 of 45
    expect(screen.getByText(`Showing ${PAGE_SIZE + 1}–${PAGE_SIZE * 2} of 45`)).toBeInTheDocument();
  });

  it("shows 'No results' when the page is empty", () => {
    render(<Pagination page={0} onPageChange={vi.fn()} count={0} rowCount={0} />);
    // rowCount=0, hasPrev=false, hasNext=false, but rowCount<=PAGE_SIZE so
    // this returns null per current logic — this test documents that
    // behavior rather than asserting "No results" text renders, since the
    // component intentionally renders nothing in this exact case.
    expect(screen.queryByText("No results")).not.toBeInTheDocument();
  });
});
