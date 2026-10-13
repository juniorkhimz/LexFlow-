import { formatDate } from "@/lib/utils";
import type { Activity } from "@/types/database";

const ACTION_LABELS: Record<string, string> = {
  "lead.created": "created this lead",
  "lead.updated": "updated this lead",
  "lead.converted": "converted this lead to a client",
  "client.created": "created this client",
  "matter.created": "created this matter",
  "matter.updated": "updated this matter",
  "document.uploaded": "uploaded a document",
  "quote.created": "created a quote",
  "quote.accepted": "marked a quote as accepted",
  "invoice.created": "created an invoice",
  "payment.recorded": "recorded a payment",
  "task.completed": "completed a task",
  "deadline.created": "added a deadline",
  "appointment.booked": "booked an appointment",
};

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-400">No activity yet.</p>;
  }
  return (
    <ol className="space-y-4">
      {activities.map((activity) => (
        <li key={activity.id} className="flex gap-3 text-sm">
          <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass-500" />
          <div>
            <p className="text-ink-800">
              {ACTION_LABELS[activity.action] ?? activity.action}
            </p>
            <p className="text-xs text-ink-400">{formatDate(activity.created_at, { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
