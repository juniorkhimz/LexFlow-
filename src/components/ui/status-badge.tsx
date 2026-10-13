import { cn } from "@/lib/utils";

// Maps a raw status string (any entity's status enum) to a semantic tone.
// Centralizing this means every module — leads, matters, invoices, quotes —
// gets visually consistent status color coding for free.
const TONE_MAP: Record<string, "neutral" | "info" | "warning" | "success" | "danger"> = {
  new: "info", contacted: "info", conflict_check: "warning", under_review: "warning",
  qualified: "info", consultation_scheduled: "info", quote_sent: "warning",
  converted: "success", rejected: "danger",
  draft: "neutral", sent: "info", accepted: "success", expired: "danger",
  intake: "neutral", active: "success", pending: "warning", on_hold: "warning",
  completed: "success", closed: "neutral",
  todo: "neutral", in_progress: "info", cancelled: "danger",
  low: "neutral", medium: "info", high: "warning", critical: "danger",
  scheduled: "info", confirmed: "success", no_show: "danger",
  paid: "success", partially_paid: "warning", overdue: "danger",
  missed: "danger", verified: "success",
};

const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-ink-100 text-ink-700",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = TONE_MAP[status] ?? "neutral";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
