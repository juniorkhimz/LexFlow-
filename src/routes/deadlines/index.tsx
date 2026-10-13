import { useDocumentTitle } from "@/hooks/use-document-title";
import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { DateDisplay } from "@/components/ui/display";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import { useDeadlines, useCreateDeadline, useUpdateDeadline, useDeleteDeadline } from "@/lib/queries/deadlines";
import { useMatterOptions } from "@/lib/queries/matters";
import { useClientOptions } from "@/lib/queries/clients";
import { useStaffOptions } from "@/lib/queries/team";

const deadlineSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  due_date: z.string().min(1, "Due date is required."),
  priority: z.enum(["low", "medium", "high", "critical"]),
  matter_id: z.string().optional(),
  client_id: z.string().optional(),
  owner_id: z.string().optional(),
});
type DeadlineFormValues = z.infer<typeof deadlineSchema>;

function NewDeadlineDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createDeadline = useCreateDeadline();
  const { data: matters } = useMatterOptions();
  const { data: clients } = useClientOptions();
  const { data: staff } = useStaffOptions();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DeadlineFormValues>({
    resolver: zodResolver(deadlineSchema),
    defaultValues: { priority: "medium" },
  });

  const onSubmit = async (values: DeadlineFormValues) => {
    try {
      await createDeadline.mutateAsync({
        ...values,
        due_date: new Date(values.due_date).toISOString(),
        matter_id: values.matter_id || null,
        client_id: values.client_id || null,
        owner_id: values.owner_id || null,
        status: "pending",
      });
      reset();
      onOpenChange(false);
    } catch {
      // surfaced via createDeadline.isError below
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink-950/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface-raised p-5 shadow-xl">
          <Dialog.Title className="font-display text-lg font-semibold text-ink-900">New deadline</Dialog.Title>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register("title")} />
              <FieldError message={errors.title?.message} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="due_date">Due date</Label>
                <Input id="due_date" type="date" {...register("due_date")} />
                <FieldError message={errors.due_date?.message} />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <select id="priority" className="h-9 w-full rounded-md border border-ink-200 bg-surface-raised px-3 text-sm" {...register("priority")}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="matter_id">Matter</Label>
                <select id="matter_id" className="h-9 w-full rounded-md border border-ink-200 bg-surface-raised px-3 text-sm" {...register("matter_id")}>
                  <option value="">None</option>
                  {matters?.map((m) => <option key={m.id} value={m.id}>{m.matter_name}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="client_id">Client</Label>
                <select id="client_id" className="h-9 w-full rounded-md border border-ink-200 bg-surface-raised px-3 text-sm" {...register("client_id")}>
                  <option value="">None</option>
                  {clients?.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="owner_id">Owner</Label>
              <select id="owner_id" className="h-9 w-full rounded-md border border-ink-200 bg-surface-raised px-3 text-sm" {...register("owner_id")}>
                <option value="">Unassigned</option>
                {staff?.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...register("description")} />
            </div>
            {createDeadline.isError && <p className="text-sm text-danger">Failed to create deadline. Please try again.</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating…" : "Create deadline"}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function DeadlinesPage() {
  useDocumentTitle("Deadlines");
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { data, isLoading, isError, refetch } = useDeadlines({ search: search || undefined });
  const updateDeadline = useUpdateDeadline();
  const deleteDeadline = useDeleteDeadline();

  return (
    <div>
      <PageHeader
        title="Deadlines"
        description="Every critical date across your firm's matters, in one place."
        actions={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New deadline</Button>}
      />

      <div className="mb-4">
        <SearchInput className="max-w-xs" placeholder="Search deadlines…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <LoadingState label="Loading deadlines…" />
      ) : isError ? (
        <ErrorState message="Unable to load deadlines." onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No deadlines yet"
          description="Deadlines you add will appear here, sorted soonest first."
          action={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New deadline</Button>}
        />
      ) : (
        <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-surface-raised">
          {data.map((d) => (
            <li
              key={d.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3",
                d.priority === "critical" && d.status === "pending" && "bg-danger/5",
              )}
            >
              <button
                onClick={() => updateDeadline.mutate({ id: d.id, status: d.status === "completed" ? "pending" : "completed" })}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                  d.status === "completed" ? "border-success bg-success text-white" : "border-ink-300",
                )}
                aria-label="Toggle complete"
              >
                {d.status === "completed" && <Check className="h-3.5 w-3.5" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-sm font-medium", d.status === "completed" ? "text-ink-400 line-through" : "text-ink-900")}>{d.title}</p>
                <p className="text-xs text-ink-400">{d.matters?.matter_name ?? d.clients?.full_name ?? "—"}</p>
              </div>
              <DateDisplay value={d.due_date} opts={{ dateStyle: "medium" }} />
              <StatusBadge status={d.priority} />
              <button onClick={() => deleteDeadline.mutate(d.id)} className="text-ink-400 hover:text-danger" aria-label="Delete deadline">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <NewDeadlineDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
