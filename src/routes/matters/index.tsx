import { useDocumentTitle } from "@/hooks/use-document-title";
import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, LayoutGrid, List as ListIcon, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, FieldError, Textarea } from "@/components/ui/input";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { CurrencyDisplay, DateDisplay } from "@/components/ui/display";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import { useMatters, useCreateMatter, type MatterFilters } from "@/lib/queries/matters";
import { useClientOptions } from "@/lib/queries/clients";
import { usePracticeAreas } from "@/lib/queries/practice-areas";
import { useStaffOptions } from "@/lib/queries/team";
import { CsvImportDialog } from "@/components/import/csv-import-dialog";
import { mattersImportConfig } from "@/lib/queries/import-matters";
import type { Matter, MatterStatus } from "@/types/database";

const STATUSES: MatterStatus[] = ["intake", "active", "pending", "on_hold", "completed", "closed"];

const matterSchema = z.object({
  matter_number: z.string().min(1, "Matter number is required."),
  matter_name: z.string().min(1, "Matter name is required."),
  client_id: z.string().min(1, "Select a client."),
  practice_area_id: z.string().optional(),
  advocate_id: z.string().optional(),
  description: z.string().optional(),
  start_date: z.string().min(1, "Start date is required."),
  notes: z.string().optional(),
});
type MatterFormValues = z.infer<typeof matterSchema>;

function NewMatterDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createMatter = useCreateMatter();
  const { data: clients } = useClientOptions();
  const { data: practiceAreas } = usePracticeAreas();
  const { data: staff } = useStaffOptions();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MatterFormValues>({
    resolver: zodResolver(matterSchema),
    defaultValues: { start_date: new Date().toISOString().slice(0, 10) },
  });

  const onSubmit = async (values: MatterFormValues) => {
    try {
      await createMatter.mutateAsync({
        ...values,
        practice_area_id: values.practice_area_id || null,
        advocate_id: values.advocate_id || null,
        status: "intake",
      });
      reset();
      onOpenChange(false);
    } catch {
      // surfaced via createMatter.isError below
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink-950/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[90vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-surface-raised p-5 shadow-xl">
          <Dialog.Title className="font-display text-lg font-semibold text-ink-900">New matter</Dialog.Title>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="matter_number">Matter number</Label>
                <Input id="matter_number" placeholder="M-2026-001" {...register("matter_number")} />
                <FieldError message={errors.matter_number?.message} />
              </div>
              <div>
                <Label htmlFor="start_date">Start date</Label>
                <Input id="start_date" type="date" {...register("start_date")} />
                <FieldError message={errors.start_date?.message} />
              </div>
            </div>
            <div>
              <Label htmlFor="matter_name">Matter name</Label>
              <Input id="matter_name" {...register("matter_name")} />
              <FieldError message={errors.matter_name?.message} />
            </div>
            <div>
              <Label htmlFor="client_id">Client</Label>
              <select id="client_id" className="h-9 w-full rounded-md border border-ink-200 bg-surface-raised px-3 text-sm" {...register("client_id")}>
                <option value="">Select a client…</option>
                {clients?.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
              <FieldError message={errors.client_id?.message} />
              {clients?.length === 0 && <p className="mt-1 text-xs text-ink-400">No clients yet — create one first.</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="practice_area_id">Practice area</Label>
                <select id="practice_area_id" className="h-9 w-full rounded-md border border-ink-200 bg-surface-raised px-3 text-sm" {...register("practice_area_id")}>
                  <option value="">None</option>
                  {practiceAreas?.map((pa) => <option key={pa.id} value={pa.id}>{pa.name}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="advocate_id">Assigned advocate</Label>
                <select id="advocate_id" className="h-9 w-full rounded-md border border-ink-200 bg-surface-raised px-3 text-sm" {...register("advocate_id")}>
                  <option value="">Unassigned</option>
                  {staff?.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={2} {...register("description")} />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={2} {...register("notes")} />
            </div>
            {createMatter.isError && <p className="text-sm text-danger">Failed to create matter. Please try again.</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating…" : "Create matter"}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function MattersIndexPage() {
  useDocumentTitle("Matters");
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<MatterStatus | "all">("all");
  const [view, setView] = React.useState<"table" | "card">("table");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const { page, setPage, from, to } = usePagination();

  const filters: MatterFilters = { search: search || undefined, status, from, to };
  const { data, isLoading, isError, refetch } = useMatters(filters);

  React.useEffect(() => setPage(0), [search, status]);

  const columns: DataTableColumn<Matter & { clients: { full_name: string } | null }>[] = [
    { key: "matter_name", header: "Matter", render: (m) => <div><p className="font-medium text-ink-900">{m.matter_name}</p><p className="text-xs text-ink-400">{m.matter_number}</p></div> },
    { key: "client", header: "Client", render: (m) => m.clients?.full_name ?? "—" },
    { key: "status", header: "Status", render: (m) => <StatusBadge status={m.status} /> },
    { key: "progress", header: "Progress", render: (m) => `${m.progress}%` },
    { key: "billed_amount", header: "Billed", render: (m) => <CurrencyDisplay amount={m.billed_amount} /> },
    { key: "start_date", header: "Started", render: (m) => <DateDisplay value={m.start_date} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Matters"
        description="Active matters across your firm's practice areas."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Import CSV</Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New matter</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput className="max-w-xs" placeholder="Search matters…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select
          className="h-9 rounded-md border border-ink-200 bg-surface-raised px-3 text-sm text-ink-800"
          value={status}
          onChange={(e) => setStatus(e.target.value as MatterStatus | "all")}
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <div className="ml-auto flex overflow-hidden rounded-md border border-ink-200">
          <button className={cn("flex h-9 w-9 items-center justify-center", view === "table" ? "bg-nav-bg text-white" : "bg-surface-raised text-ink-500")} onClick={() => setView("table")} aria-label="Table view">
            <ListIcon className="h-4 w-4" />
          </button>
          <button className={cn("flex h-9 w-9 items-center justify-center", view === "card" ? "bg-nav-bg text-white" : "bg-surface-raised text-ink-500")} onClick={() => setView("card")} aria-label="Card view">
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading matters…" />
      ) : isError ? (
        <ErrorState message="Unable to load matters." onRetry={() => refetch()} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState
          title={search || status !== "all" ? "No matters match your filters" : "No matters yet"}
          description="Open a matter from a client's profile, or create one directly."
          action={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New matter</Button>}
        />
      ) : view === "table" ? (
        <>
          <DataTable columns={columns} rows={data.rows} onRowClick={(m) => navigate({ to: `/matters/${m.id}` })} />
          <Pagination page={page} onPageChange={setPage} count={data.count} rowCount={data.rows.length} />
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.rows.map((m) => (
              <Card key={m.id} className="cursor-pointer hover:shadow-md" onClick={() => navigate({ to: `/matters/${m.id}` })}>
                <CardContent className="space-y-2 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-ink-900">{m.matter_name}</p>
                    <StatusBadge status={m.status} />
                  </div>
                  <p className="text-xs text-ink-400">{m.matter_number} · {m.clients?.full_name ?? "—"}</p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full bg-brass-500" style={{ width: `${m.progress}%` }} />
                  </div>
                  <p className="text-xs text-ink-500"><CurrencyDisplay amount={m.billed_amount} /> billed</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Pagination page={page} onPageChange={setPage} count={data.count} rowCount={data.rows.length} />
        </>
      )}

      <NewMatterDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} config={mattersImportConfig} />
    </div>
  );
}
