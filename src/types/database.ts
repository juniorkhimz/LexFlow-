// Hand-maintained. Do not paste generated output here.
// Generated types live in ./database.generated.ts (run `npm run types:generate`).
import type { Database } from "./database.generated";
export * from "./database.generated";

type Tbl = Database["public"]["Tables"];
type En = Database["public"]["Enums"];

export type UserRole = En["user_role"];
export type LeadStatus = En["lead_status"];
export type Priority = En["lead_priority"];
export type ClientType = En["client_type"];
export type KycStatus = En["kyc_status"];
export type MatterStatus = En["matter_status"];
export type TaskStatus = En["task_status"];
export type DeadlineStatus = En["deadline_status"];
export type AppointmentType = En["appointment_type"];
export type AppointmentStatus = En["appointment_status"];
export type QuoteStatus = En["quote_status"];
export type InvoiceStatus = En["invoice_status"];
export type PaymentMethod = En["payment_method"];
export type DocumentCategory = En["document_category"];
export type TrustTransactionType = En["trust_transaction_type"];

export type Firm = Tbl["firms"]["Row"];
export type Profile = Tbl["profiles"]["Row"];
export type PracticeArea = Tbl["practice_areas"]["Row"];
export type Lead = Tbl["leads"]["Row"];
export type Client = Tbl["clients"]["Row"];
export type Matter = Tbl["matters"]["Row"];
export type Task = Tbl["tasks"]["Row"];
export type Deadline = Tbl["deadlines"]["Row"];
export type Appointment = Tbl["appointments"]["Row"];
export type Quote = Tbl["quotes"]["Row"];
export type QuoteItem = Tbl["quote_items"]["Row"];
export type Invoice = Tbl["invoices"]["Row"];
export type InvoiceItem = Tbl["invoice_items"]["Row"];
export type Payment = Tbl["payments"]["Row"];
export type DocumentRow = Tbl["documents"]["Row"];
export type Activity = Tbl["activities"]["Row"];
export type MessageRow = Tbl["messages"]["Row"];
export type NotificationRow = Tbl["notifications"]["Row"];
export type Invitation = Tbl["invitations"]["Row"];
export type Subscription = Tbl["subscriptions"]["Row"];
export type PlatformAdmin = Tbl["platform_admins"]["Row"];
export type TrustTransaction = Tbl["trust_transactions"]["Row"];
export type PlanLimit = Tbl["plan_limits"]["Row"];
