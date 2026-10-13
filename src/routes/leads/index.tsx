import { useDocumentTitle } from "@/hooks/use-document-title";
import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, Textarea } from "@/components/ui/input";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { DateDisplay, CurrencyDisplay } from "@/components/ui/display";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useCreateLead, useLeads, type LeadFilters } from "@/lib/queries/leads";
import { CsvImportDialog } from "@/components/import/csv-import-dialog";
import { leadsImportConfig } from "@/lib/queries/import-leads";
import { usePracticeAreas } from "@/lib/queries/practice-areas";
import { useStaffOptions } from "@/lib/queries/team";
import type { Lead, LeadStatus } from "@/types/database";

const STATUSES: LeadStatus[] = [
  "new", "contacted", "conflict_check", "under_review", "qualified",
  "consultation_scheduled", "quote_sent", "converted", "rejected",
];

const leadSchema = z.object({
  name: z.string().min(1, "Name is required."),
  company: z.string().optional(),
  email: z.string().email("Enter a valid email address.").optional().or(z.literal("")),
  phone: z.string().optional(),
  source: z.string().optional(),
  estimated_value: z.coerce.number().nonnegative().optional(),
  practice_area_id: z.string().optional(),
  advocate_id: z.string().optional(),
  notes: z.string().optional(),
});
type LeadFormValues = z.infer<typeof leadSchema>;

function NewLeadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createLead = useCreateLead();
  const { data: practiceAreas } = usePracticeAreas();
  const { data: staff } = useStaffOptions();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
  });

  const onSubmit = async (values: LeadFormValues) => {
    try {
      await createLead.mutateAsync({
        ...values,
        email: values.email || null,
        estimated_value: values.estimated_value ?? null,
        practice_area_id: values.practice_area_id || null,
        advocate_id: values.advocate_id || null,
        status: "new",
        priority: "medium",
      });
      reset();
      onOpenChange(false);
    } catch {
      // surfaced via createLead.error below
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink-950/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[90vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-surface-raised p-5 shadow-xl">
          <Dialog.Title className="font-display text-lg font-semibold text-ink-900">New lead</Dialog.Title>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register("name")} />
              <FieldError message={errors.name?.message} />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input id="company" {...register("company")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
                <FieldError message={errors.email?.message} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register("phone")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="source">Source</Label>
                <Input id="source" placeholder="Referral, website…" {...register("source")} />
              </div>
              <div>
                <Label htmlFor="estimated_value">Estimated value (KES)</Label>
                <Input id="estimated_value" type="number" step="0.01" {...register("estimated_value")} />
              </div>
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
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={3} {...register("notes")} />
            </div>
            {createLead.isError && <p className="text-sm text-danger">Failed to create lead. Please try again.</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating…" : "Create lead"}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function LeadsIndexPage() {
  useDocumentTitle("Leads");
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<LeadStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const { page, setPage, from, to } = usePagination();

  const filters: LeadFilters = { search: search || undefined, status, from, to };
  const { data, isLoading, isError, refetch } = useLeads(filters);

  React.useEffect(() => setPage(0), [search, status]);

  const columns: DataTableColumn<Lead>[] = [
    { key: "name", header: "Name", render: (l) => <div><p className="font-medium text-ink-900">{l.name}</p>{l.company && <p className="text-xs text-ink-400">{l.company}</p>}</div> },
    { key: "status", header: "Status", render: (l) => <StatusBadge status={l.status} /> },
    { key: "priority", header: "Priority", render: (l) => <StatusBadge status={l.priority} /> },
    { key: "estimated_value", header: "Est. value", render: (l) => l.estimated_value != null ? <CurrencyDisplay amount={l.estimated_value} /> : "—" },
    { key: "created_at", header: "Created", render: (l) => <DateDisplay value={l.created_at} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Track and qualify inbound leads before they become clients."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Import CSV</Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New lead</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput
          className="max-w-xs"
          placeholder="Search leads…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="h-9 rounded-md border border-ink-200 bg-surface-raised px-3 text-sm text-ink-800"
          value={status}
          onChange={(e) => setStatus(e.target.value as LeadStatus | "all")}
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading leads…" />
      ) : isError ? (
        <ErrorState message="Unable to load leads." onRetry={() => refetch()} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState
          title={search || status !== "all" ? "No leads match your filters" : "No leads yet"}
          description={search || status !== "all" ? "Try a different search or status." : "New leads you add will show up here."}
          action={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New lead</Button>}
        />
      ) : (
        <>
          <DataTable columns={columns} rows={data.rows} onRowClick={(l) => navigate({ to: `/leads/${l.id}` })} />
          <Pagination page={page} onPageChange={setPage} count={data.count} rowCount={data.rows.length} />
        </>
      )}

      <NewLeadDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} config={leadsImportConfig} />
    </div>
  );
}
