import { useDocumentTitle } from "@/hooks/use-document-title";
import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { DateDisplay } from "@/components/ui/display";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useClientOptions } from "@/lib/queries/clients";
import { useLeadOptions } from "@/lib/queries/leads";
import { useMatterOptions } from "@/lib/queries/matters";
import {
  useAppointments, useCreateAppointment, useUpdateAppointment, useDeleteAppointment, APPOINTMENT_STATUSES,
} from "@/lib/queries/appointments";
import type { AppointmentStatus, AppointmentType } from "@/types/database";

const TYPES: AppointmentType[] = ["consultation", "meeting", "court", "call", "other"];

const apptSchema = z
  .object({
    title: z.string().min(1, "Title is required."),
    client_id: z.string().optional(),
    lead_id: z.string().optional(),
    matter_id: z.string().optional(),
    appointment_date: z.string().min(1, "Date is required."),
    start_time: z.string().min(1, "Start time is required."),
    end_time: z.string().min(1, "End time is required."),
    type: z.enum(["consultation", "meeting", "court", "call", "other"]),
    location: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((v) => v.end_time > v.start_time, { message: "End time must be after start time.", path: ["end_time"] });
type ApptFormValues = z.infer<typeof apptSchema>;

function NewAppointmentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createAppt = useCreateAppointment();
  const { data: clients } = useClientOptions();
  const { data: leads } = useLeadOptions();
  const { data: matters } = useMatterOptions();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ApptFormValues>({
    resolver: zodResolver(apptSchema),
    defaultValues: { type: "consultation", appointment_date: new Date().toISOString().slice(0, 10) },
  });

  const onSubmit = async (values: ApptFormValues) => {
    try {
      await createAppt.mutateAsync({
        ...values,
        client_id: values.client_id || null,
        lead_id: values.lead_id || null,
        matter_id: values.matter_id || null,
        status: "scheduled",
      });
      reset();
      onOpenChange(false);
    } catch {
      // surfaced via createAppt.isError below
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink-950/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[90vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-surface-raised p-5 shadow-xl">
          <Dialog.Title className="font-display text-lg font-semibold text-ink-900">Book appointment</Dialog.Title>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register("title")} />
              <FieldError message={errors.title?.message} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="client_id">Client</Label>
                <select id="client_id" className="h-9 w-full rounded-md border border-ink-200 bg-surface-raised px-3 text-sm" {...register("client_id")}>
                  <option value="">None</option>
                  {clients?.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="lead_id">Lead</Label>
                <select id="lead_id" className="h-9 w-full rounded-md border border-ink-200 bg-surface-raised px-3 text-sm" {...register("lead_id")}>
                  <option value="">None</option>
                  {leads?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="matter_id">Matter</Label>
                <select id="matter_id" className="h-9 w-full rounded-md border border-ink-200 bg-surface-raised px-3 text-sm" {...register("matter_id")}>
                  <option value="">None</option>
                  {matters?.map((m) => <option key={m.id} value={m.id}>{m.matter_name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="appointment_date">Date</Label>
                <Input id="appointment_date" type="date" {...register("appointment_date")} />
                <FieldError message={errors.appointment_date?.message} />
              </div>
              <div>
                <Label htmlFor="start_time">Start</Label>
                <Input id="start_time" type="time" {...register("start_time")} />
                <FieldError message={errors.start_time?.message} />
              </div>
              <div>
                <Label htmlFor="end_time">End</Label>
                <Input id="end_time" type="time" {...register("end_time")} />
                <FieldError message={errors.end_time?.message} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="type">Type</Label>
                <select id="type" className="h-9 w-full rounded-md border border-ink-200 bg-surface-raised px-3 text-sm" {...register("type")}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" {...register("location")} />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={2} {...register("notes")} />
            </div>
            {createAppt.isError && <p className="text-sm text-danger">Failed to book appointment. Please try again.</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Booking…" : "Book appointment"}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function AppointmentsPage() {
  useDocumentTitle("Appointments");
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { data, isLoading, isError, refetch } = useAppointments({ search: search || undefined });
  const updateAppt = useUpdateAppointment();
  const deleteAppt = useDeleteAppointment();

  return (
    <div>
      <PageHeader
        title="Appointments"
        description="Consultations, meetings, and court dates."
        actions={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> Book appointment</Button>}
      />

      <div className="mb-4">
        <SearchInput className="max-w-xs" placeholder="Search appointments…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <LoadingState label="Loading appointments…" />
      ) : isError ? (
        <ErrorState message="Unable to load appointments." onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No appointments yet"
          description="Book a consultation or meeting to see it here."
          action={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> Book appointment</Button>}
        />
      ) : (
        <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-surface-raised">
          {data.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{a.title}</p>
                <p className="text-xs text-ink-400">
                  {a.clients?.full_name ?? a.leads?.name ?? a.matters?.matter_name ?? "No association"} · {a.type} {a.location ? `· ${a.location}` : ""}
                </p>
              </div>
              <div className="text-right text-sm text-ink-700">
                <DateDisplay value={a.appointment_date} /> <span className="text-ink-400">{a.start_time.slice(0, 5)}–{a.end_time.slice(0, 5)}</span>
              </div>
              <select
                className="rounded-md border border-ink-200 bg-surface-raised px-2 py-1 text-xs"
                value={a.status}
                onChange={(e) => updateAppt.mutate({ id: a.id, status: e.target.value as AppointmentStatus })}
              >
                {APPOINTMENT_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
              <StatusBadge status={a.status} />
              <button onClick={() => deleteAppt.mutate(a.id)} className="text-ink-400 hover:text-danger" aria-label="Cancel and remove">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <NewAppointmentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
