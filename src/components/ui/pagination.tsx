import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAGE_SIZE } from "@/hooks/use-pagination";

export function Pagination({
  page,
  onPageChange,
  count,
  rowCount,
}: {
  page: number;
  onPageChange: (page: number) => void;
  /** Exact total row count from a Supabase `{ count: "exact" }` query. */
  count: number | null;
  /** Number of rows actually returned on this page (to detect the last page when count is null). */
  rowCount: number;
}) {
  const totalPages = count != null ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : null;
  const hasNext = totalPages != null ? page + 1 < totalPages : rowCount === PAGE_SIZE;
  const hasPrev = page > 0;
  const rangeStart = page * PAGE_SIZE + 1;
  const rangeEnd = page * PAGE_SIZE + rowCount;

  if (!hasPrev && !hasNext && rowCount <= PAGE_SIZE) return null;

  return (
    <div className="mt-3 flex items-center justify-between text-sm text-ink-500">
      <span>
        {rowCount === 0 ? "No results" : `Showing ${rangeStart}–${rangeEnd}${count != null ? ` of ${count}` : ""}`}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={!hasPrev} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => onPageChange(page + 1)}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
