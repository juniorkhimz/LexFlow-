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
import { DateDisplay } from "@/components/ui/display";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useClients, useCreateClient, type ClientFilters } from "@/lib/queries/clients";
import { CsvImportDialog } from "@/components/import/csv-import-dialog";
import { clientsImportConfig } from "@/lib/queries/import-clients";
import type { Client, ClientType } from "@/types/database";

const TYPES: ClientType[] = ["individual", "company", "organization"];

const clientSchema = z.object({
  full_name: z.string().min(1, "Name is required."),
  organization: z.string().optional(),
  email: z.string().email("Enter a valid email address.").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  id_number: z.string().optional(),
  client_type: z.enum(["individual", "company", "organization"]),
  notes: z.string().optional(),
});
type ClientFormValues = z.infer<typeof clientSchema>;

function NewClientDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createClient = useCreateClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { client_type: "individual" },
  });

  const onSubmit = async (values: ClientFormValues) => {
    try {
      await createClient.mutateAsync({ ...values, email: values.email || null, kyc_status: "pending" });
      reset();
      onOpenChange(false);
    } catch {
      // surfaced via createClient.isError below
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink-950/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[90vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-surface-raised p-5 shadow-xl">
          <Dialog.Title className="font-display text-lg font-semibold text-ink-900">New client</Dialog.Title>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
            <div>
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" {...register("full_name")} />
              <FieldError message={errors.full_name?.message} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="client_type">Client type</Label>
                <select id="client_type" className="h-9 w-full rounded-md border border-ink-200 bg-surface-raised px-3 text-sm" {...register("client_type")}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="organization">Organization</Label>
                <Input id="organization" {...register("organization")} />
              </div>
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
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register("address")} />
            </div>
            <div>
              <Label htmlFor="id_number">ID / passport number</Label>
              <Input id="id_number" {...register("id_number")} />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={3} {...register("notes")} />
            </div>
            {createClient.isError && <p className="text-sm text-danger">Failed to create client. Please try again.</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating…" : "Create client"}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function ClientsIndexPage() {
  useDocumentTitle("Clients");
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [clientType, setClientType] = React.useState<ClientType | "all">("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const { page, setPage, from, to } = usePagination();

  const filters: ClientFilters = { search: search || undefined, clientType, from, to };
  const { data, isLoading, isError, refetch } = useClients(filters);

  React.useEffect(() => setPage(0), [search, clientType]);

  const columns: DataTableColumn<Client>[] = [
    { key: "full_name", header: "Name", render: (c) => <div><p className="font-medium text-ink-900">{c.full_name}</p>{c.organization && <p className="text-xs text-ink-400">{c.organization}</p>}</div> },
    { key: "client_type", header: "Type", render: (c) => <span className="capitalize text-ink-700">{c.client_type}</span> },
    { key: "kyc_status", header: "KYC", render: (c) => <StatusBadge status={c.kyc_status} /> },
    { key: "email", header: "Email", render: (c) => c.email ?? "—" },
    { key: "created_at", header: "Created", render: (c) => <DateDisplay value={c.created_at} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Firm clients, their matters, documents and billing history."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Import CSV</Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New client</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput
          className="max-w-xs"
          placeholder="Search clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="h-9 rounded-md border border-ink-200 bg-surface-raised px-3 text-sm text-ink-800"
          value={clientType}
          onChange={(e) => setClientType(e.target.value as ClientType | "all")}
        >
          <option value="all">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading clients…" />
      ) : isError ? (
        <ErrorState message="Unable to load clients." onRetry={() => refetch()} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState
          title={search || clientType !== "all" ? "No clients match your filters" : "No clients yet"}
          description={search || clientType !== "all" ? "Try a different search or type." : "Clients created directly, or converted from leads, will show up here."}
          action={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New client</Button>}
        />
      ) : (
        <>
          <DataTable columns={columns} rows={data.rows} onRowClick={(c) => navigate({ to: `/clients/${c.id}` })} />
          <Pagination page={page} onPageChange={setPage} count={data.count} rowCount={data.rows.length} />
        </>
      )}

      <NewClientDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} config={clientsImportConfig} />
    </div>
  );
}
