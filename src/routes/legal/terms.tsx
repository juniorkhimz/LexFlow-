import { useDocumentTitle } from "@/hooks/use-document-title";
import {
  BulletList,
  CONTACT_EMAIL,
  LEGAL_LAST_UPDATED,
  LegalNotice,
  OPERATOR_NAME,
  Section,
} from "@/routes/legal/legal-notice";

// FIRST DRAFT for counsel. Statements about product behaviour were checked
// against the application as of the "last updated" date. Decisions a
// lawyer or the business must make are marked COUNSEL / BUSINESS in JSX
// comments — search this file for those words.
export default function TermsPage() {
  useDocumentTitle("Terms of Service");
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-ink-800">
      <h1 className="mb-2 font-display text-2xl font-semibold text-ink-900">Terms of Service</h1>
      <p className="mb-6 text-ink-500">Last updated: {LEGAL_LAST_UPDATED}</p>
      <LegalNotice />

      <div className="space-y-6">
        <Section title="1. The service and who these terms bind">
          <p>
            LexFlow is a web-based practice management service for law firms and legal professionals. By creating
            an account, you agree to these terms. If you create an account for a firm, you confirm that you are
            authorised to bind that firm, and "you" includes the firm. You must be at least 18.
          </p>
          <p>LexFlow is operated by LexFlow LLP ("we", "us").</p>        </Section>

        <Section title="2. Accounts and access">
          <p>
            You are responsible for your login details and for everything done under your account. Firm
            administrators decide who joins the firm, what role each person has, and which clients are invited to
            the client portal. Give access only to people who should have it, and remove it when they leave.
            Keep the information on your account accurate.
          </p>
        </Section>

        <Section title="3. Plans, billing and cancellation">
          <p>
            LexFlow offers a limited Free plan and paid plans. The plans, prices and what each includes are shown
            in the application when you subscribe. Paid plans renew automatically each billing period and are
            charged in advance through our payment provider, Paystack.
          </p>
          <p>
            If a subscription is cancelled, payment fails, or there is no active subscription, your firm returns to
            the limits of the Free plan. These limits can restrict inviting users, client portal access and
            document storage. You can cancel from Settings, then Billing.
          </p>
          <p>Unless the law requires otherwise, fees already paid are not refunded.</p>
          {/* BUSINESS/COUNSEL: confirm the refund position, whether access continues to the end of a paid
              period after cancellation, and how long data is kept after a downgrade. */}
        </Section>

        <Section title="4. Your content and responsibilities">
          <p>
            Your firm owns the data it puts into LexFlow. You give us permission to store and process it only to
            provide the service. You are responsible for:
          </p>
          <BulletList>
            <li>the accuracy and lawfulness of the data you enter, including having a lawful basis to hold your clients' information;</li>
            <li>your professional duties, including confidentiality, privilege and the handling of client money;</li>
            <li>checking that deadlines, dates and calculations are correct. Reminders and totals in LexFlow are aids, not guarantees, and you should verify limitation periods and court deadlines against the applicable rules;</li>
            <li>your own compliance with the laws and professional rules that apply to your practice.</li>
          </BulletList>
          <p>
            LexFlow is software, not a law firm. It does not give legal advice, and its trust accounting features
            are a record-keeping tool. They do not by themselves make your firm compliant with any trust-account
            rules or audit requirements.
          </p>
        </Section>

        <Section title="5. AI features">
          <p>
            The in-app assistant is a general-purpose tool. Its answers may be incomplete or wrong, and they are not
            legal advice. You must check anything you rely on. Do not enter client-identifying or privileged
            information into the assistant. Matter and dashboard insights currently use sample data only and do not
            reflect your real records. Our Privacy Policy explains how AI features handle data.
          </p>
        </Section>

        <Section title="6. Acceptable use">
          <p>You agree not to:</p>
          <BulletList>
            <li>use LexFlow for anything unlawful, or to store content you have no right to hold;</li>
            <li>try to access another firm's data, or to probe, disrupt or bypass the service's security;</li>
            <li>copy, resell or reverse engineer the service, or use automated tools to extract data from it;</li>
            <li>share a login between several people.</li>
          </BulletList>
          <p>We may suspend access to protect the service or other users if these rules are broken.</p>
        </Section>

        <Section title="7. Data protection">
          <p>
            For client and matter data, your firm decides how the data is used and LexFlow processes it on your
            behalf. Our Privacy Policy describes the data we handle and our service providers.
          </p>
          {/* COUNSEL: attach or reference a data processing agreement between LexFlow and each firm. */}
        </Section>

        <Section title="8. Availability and changes">
          <p>
            We aim to keep LexFlow available but do not promise uninterrupted or error-free service. We may
            update, change or retire features. Please keep your own copies of records you cannot afford to lose.
          </p>
          {/* COUNSEL/BUSINESS: add an uptime commitment or SLA only if you intend to offer one. */}
        </Section>

        <Section title="9. Ending your account and your data">
          <p>
            You can stop using LexFlow at any time. Your firm can ask us for an export or deletion of its data by
            emailing {CONTACT_EMAIL}. We may suspend or end your access for serious or repeated breaches of these
            terms or for non-payment, with notice where reasonably possible.
          </p>
          {/* BUSINESS/COUNSEL: state how long data is kept after closure and how export is delivered. */}
        </Section>

        <Section title="10. Disclaimers and limit of liability">
          <p>
            To the extent the law allows, LexFlow is provided "as is", and we are not liable for indirect or
            consequential loss, loss of profit, or loss of data you could have backed up. Our total liability for
            any claim is limited to the fees you paid us in the 12 months before the claim arose. Nothing in these
            terms limits liability that cannot be limited by law.
          </p>
          {/* COUNSEL: this clause is a conservative placeholder. It must be reviewed and finalised by a lawyer,
              including how it interacts with professional-conduct and consumer rules. */}
        </Section>

        <Section title="11. Governing law">
          <p>These terms are governed by the laws of Kenya, and the courts of Kenya have jurisdiction.</p>
          {/* COUNSEL: confirm governing law, venue, and whether arbitration should apply. */}
        </Section>

        <Section title="12. Changes to these terms and contact">
          <p>
            We may update these terms. For material changes we will notify firm administrators, and continued use
            after the change means you accept it. Questions: {CONTACT_EMAIL}.
          </p>
        </Section>
      </div>
    </div>
  );
}
