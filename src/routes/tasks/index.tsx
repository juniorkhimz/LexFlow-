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
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { cn } from "@/lib/utils";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, type TaskFilters } from "@/lib/queries/tasks";
import { useMatterOptions } from "@/lib/queries/matters";
import { useStaffOptions } from "@/lib/queries/team";
import type { TaskStatus } from "@/types/database";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "completed", "cancelled"];

const taskSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  matter_id: z.string().optional(),
  assigned_to: z.string().optional(),
});
type TaskFormValues = z.infer<typeof taskSchema>;

function NewTaskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createTask = useCreateTask();
  const { data: matters } = useMatterOptions();
  const { data: staff } = useStaffOptions();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { priority: "medium" },
  });

  const onSubmit = async (values: TaskFormValues) => {
    try {
      await createTask.mutateAsync({
        ...values,
        due_date: values.due_date || null,
        matter_id: values.matter_id || null,
        assigned_to: values.assigned_to || null,
        status: "todo",
      });
      reset();
      onOpenChange(false);
    } catch {
      // surfaced via createTask.isError below
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink-950/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface-raised p-5 shadow-xl">
          <Dialog.Title className="font-display text-lg font-semibold text-ink-900">New task</Dialog.Title>
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
                <Label htmlFor="assigned_to">Assigned to</Label>
                <select id="assigned_to" className="h-9 w-full rounded-md border border-ink-200 bg-surface-raised px-3 text-sm" {...register("assigned_to")}>
                  <option value="">Unassigned</option>
                  {staff?.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...register("description")} />
            </div>
            {createTask.isError && <p className="text-sm text-danger">Failed to create task. Please try again.</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating…" : "Create task"}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function TasksPage() {
  useDocumentTitle("Tasks");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<TaskStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { page, setPage, from, to } = usePagination();

  const filters: TaskFilters = { search: search || undefined, status, from, to };
  const { data, isLoading, isError, refetch } = useTasks(filters);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  React.useEffect(() => setPage(0), [search, status]);

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Firm-wide task tracking, assigned per matter."
        actions={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New task</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput className="max-w-xs" placeholder="Search tasks…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select
          className="h-9 rounded-md border border-ink-200 bg-surface-raised px-3 text-sm text-ink-800"
          value={status}
          onChange={(e) => setStatus(e.target.value as TaskStatus | "all")}
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading tasks…" />
      ) : isError ? (
        <ErrorState message="Unable to load tasks." onRetry={() => refetch()} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState
          title={search || status !== "all" ? "No tasks match your filters" : "No tasks yet"}
          description="Tasks you create will show up here."
          action={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New task</Button>}
        />
      ) : (
        <>
          <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-surface-raised">
            {data.rows.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => updateTask.mutate({ id: t.id, status: t.status === "completed" ? "todo" : "completed" })}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                  t.status === "completed" ? "border-success bg-success text-white" : "border-ink-300",
                )}
                aria-label="Toggle complete"
              >
                {t.status === "completed" && <Check className="h-3.5 w-3.5" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-sm font-medium", t.status === "completed" ? "text-ink-400 line-through" : "text-ink-900")}>{t.title}</p>
                {t.matters?.matter_name && <p className="text-xs text-ink-400">{t.matters.matter_name}</p>}
              </div>
              <DateDisplay value={t.due_date} />
              <StatusBadge status={t.priority} />
              <button onClick={() => deleteTask.mutate(t.id)} className="text-ink-400 hover:text-danger" aria-label="Delete task">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
            ))}
          </ul>
          <Pagination page={page} onPageChange={setPage} count={data.count} rowCount={data.rows.length} />
        </>
      )}

      <NewTaskDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
