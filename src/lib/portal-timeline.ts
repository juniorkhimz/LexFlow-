// Builds the client-facing "My Case" timeline from data the portal ALREADY
// has legitimate access to (matters, documents, quotes, invoices,
// appointments — each via its own "client select own …" RLS policy in
// 0002_rls_policies.sql). No new table, no new query, no new RLS: this is
// purely a client-side re-presentation of records the client could already
// see individually in their respective tabs, merged into one story a
// non-lawyer can follow — matching the "most clients don't understand
// legal workflows, explain the matter in plain language" brief this
// feature came from.
//
// Deliberately does NOT surface internal firm activity (advocate notes,
// internal task assignments, etc.) — the `activities` audit table has no
// client-read RLS policy at all, and that's correct: a client's timeline
// should show what happened TO their matter, not the firm's internal
// workflow around it.

export interface TimelineEvent {
  date: string; // ISO date/datetime
  label: string;
}

interface TimelineInputs {
  matters: { matter_name: string; created_at: string }[];
  documents: { name: string; created_at: string }[];
  quotes: { quote_number: string; status: string; created_at: string; updated_at: string }[];
  invoices: { invoice_number: string; status: string; created_at: string; updated_at: string }[];
  appointments: { title: string; appointment_date: string; status: string }[];
}

export function buildPortalTimeline(inputs: TimelineInputs): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const m of inputs.matters) {
    events.push({ date: m.created_at, label: `Matter opened: ${m.matter_name}` });
  }
  for (const d of inputs.documents) {
    events.push({ date: d.created_at, label: `Document shared: ${d.name}` });
  }
  for (const q of inputs.quotes) {
    if (q.status !== "draft") {
      events.push({ date: q.created_at, label: `Quote sent: ${q.quote_number}` });
    }
    if (q.status === "accepted") {
      events.push({ date: q.updated_at, label: `Quote accepted: ${q.quote_number}` });
    }
  }
  for (const inv of inputs.invoices) {
    events.push({ date: inv.created_at, label: `Invoice issued: ${inv.invoice_number}` });
    if (inv.status === "paid") {
      events.push({ date: inv.updated_at, label: `Invoice paid in full: ${inv.invoice_number}` });
    }
  }
  for (const a of inputs.appointments) {
    if (a.status !== "cancelled") {
      events.push({ date: a.appointment_date, label: `Appointment: ${a.title}` });
    }
  }

  // Oldest first — reads as a story ("12 Aug: documents submitted... 20
  // Aug: next action scheduled"), not a most-recent-first activity feed.
  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
