import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

// Deliberately minimal: no built-in sorting/pagination state. Callers own
// their query params (page, sort) via TanStack Query + the URL search
// params, and pass already-sorted/paginated rows in. Keeps this component a
// pure renderer instead of a second source of truth for list state.
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-ink-200 bg-surface-raised">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-ink-100 bg-ink-50/60">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-ink-500">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "border-b border-ink-100 last:border-0",
                onRowClick && "cursor-pointer hover:bg-ink-50/60",
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn("px-4 py-3 align-middle text-ink-800", col.className)}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
