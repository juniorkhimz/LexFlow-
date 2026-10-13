import { useDocumentTitle } from "@/hooks/use-document-title";
import {
  BulletList,
  CONTACT_EMAIL,
  LEGAL_LAST_UPDATED,
  LegalNotice,
  OPERATOR_NAME,
  Section,
} from "@/routes/legal/legal-notice";

// FIRST DRAFT for counsel. Every statement below was checked against what
// the application actually does as of the "last updated" date. Items a
// lawyer must decide are marked COUNSEL in JSX comments (not visible to
// readers) — search this file for "COUNSEL".
export default function PrivacyPolicyPage() {
  useDocumentTitle("Privacy Policy");
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-ink-800">
      <h1 className="mb-2 font-display text-2xl font-semibold text-ink-900">Privacy Policy</h1>
      <p className="mb-6 text-ink-500">Last updated: {LEGAL_LAST_UPDATED}</p>
      <LegalNotice />

      <div className="space-y-6">
        <Section title="1. About this policy">
          <p>
            LexFlow is practice management software for law firms. This policy explains what personal data we
            handle, why, who else handles it, and the choices you have. It applies to the LexFlow website and
            application, including the client portal.
          </p>
          <p>LexFlow is operated by {OPERATOR_NAME} ("we", "us").</p>
          <p>You can reach us about any privacy matter at {CONTACT_EMAIL}.</p>
        </Section>

        <Section title="2. Information we handle">
          <p>We handle the following categories of information:</p>
          <BulletList>
            <li>
              <span className="font-medium">Account details:</span> your name, email address, role and a password
              (stored in hashed form by our authentication provider, never in readable form).
            </li>
            <li>
              <span className="font-medium">Firm details:</span> your firm's name and settings, practice areas,
              team members, and the email addresses of people invited to join.
            </li>
            <li>
              <span className="font-medium">Content your firm enters:</span> leads, clients (which may include
              names, contact details, addresses, identification numbers and KYC status), matters, tasks,
              deadlines, appointments, quotes, invoices, payments, trust account entries, messages between your
              firm and its clients, and uploaded documents. This content may be confidential or legally
              privileged.
            </li>
            <li>
              <span className="font-medium">Client portal details:</span> if a firm invites its client to the
              portal, that client's name and email address, and the records the firm chooses to share.
            </li>
            <li>
              <span className="font-medium">Activity records:</span> a log of actions taken in the application
              (who did what, and when), which firm administrators can view.
            </li>
            <li>
              <span className="font-medium">Billing information:</span> your firm's plan, subscription status and
              payment references. Payment card and mobile-money details are entered on Paystack's checkout.
              {/* COUNSEL/DEV: confirm LexFlow never receives or stores card numbers. */}
            </li>
            <li>
              <span className="font-medium">AI assistant messages:</span> text you type into the in-app assistant
              (see section 5).
            </li>
            <li>
              <span className="font-medium">Technical data:</span> our hosting provider may process technical
              information such as IP address and browser type in connection logs.
            </li>
          </BulletList>
        </Section>

        <Section title="3. How we use information">
          <BulletList>
            <li>To provide, secure and support the service, including signing you in and applying your firm's access rules.</li>
            <li>To process subscription payments and manage your plan.</li>
            <li>To send emails needed to run the service, such as team invitations and account emails.</li>
            <li>To maintain the activity log and detect misuse.</li>
            <li>To comply with legal obligations.</li>
          </BulletList>
          <p>
            We do not sell personal data and we do not use it for advertising. We do not currently use analytics
            or advertising trackers.
          </p>
          {/* COUNSEL: add the lawful basis for each purpose as required by the Data Protection Act 2019. */}
        </Section>

        <Section title="4. Client and matter data: our role and yours">
          <p>
            For the client, matter and document content a firm enters, the firm decides what is collected and why,
            and is responsible for having a lawful basis and for meeting its professional duties of
            confidentiality. LexFlow processes that content only on the firm's behalf, to provide the service.
          </p>
          <p>Our technical safeguards for this content include:</p>
          <BulletList>
            <li>Each firm's data is separated from every other firm's by database access rules.</li>
            <li>Users see only what their role allows. Client portal users see only their own records.</li>
            <li>Uploaded documents are kept in private storage and are opened through short-lived, signed links.</li>
            <li>Totals on quotes and invoices are calculated on the server, not trusted from the browser.</li>
          </BulletList>
          {/* COUNSEL: state who at LexFlow can access firm content, under what conditions, and whether a
              written data processing agreement is offered to each firm. */}
        </Section>

        <Section title="5. AI features">
          <p>
            <span className="font-medium">Assistant.</span> The floating LexFlow Assistant sends the messages in
            your current conversation to Google's Gemini service to generate a reply. We do not add any firm
            records to those messages. We do not store the conversation: it exists only in your browser until you
            close or refresh the page. Please do not enter client names, case details or privileged information
            into the assistant.
          </p>
          <p>
            <span className="font-medium">Matter and dashboard insights.</span> These features currently run on
            fixed, clearly labelled sample data. They do not send your real matters, documents or firm figures to
            any AI provider. Before that ever changes, we will update this policy and tell firms in advance.
          </p>
          <p>AI output can be wrong and is not legal advice.</p>
          {/* COUNSEL/DEV: confirm Google's data-use terms for the Gemini API plan in use (some plans allow
              Google to use submitted content to improve its products) and describe them here. */}
        </Section>

        <Section title="6. Service providers and where data is stored">
          <p>We use these providers to run LexFlow:</p>
          <BulletList>
            <li>
              <span className="font-medium">Supabase:</span> database, authentication and file storage. Your data
              is stored in a data centre in Ireland, within the European Union.
            </li>
            <li>
              <span className="font-medium">Vercel:</span> hosts the web application and may process connection
              logs.
            </li>
            <li>
              <span className="font-medium">Paystack:</span> processes subscription payments.
            </li>
            <li>
              <span className="font-medium">Resend:</span> delivers emails we send, such as invitations.
            </li>
            <li>
              <span className="font-medium">Google (Gemini):</span> powers the AI assistant, as described above.
            </li>
          </BulletList>
          {/* COUNSEL: confirm a data processing agreement is in place with each provider. */}
        </Section>

        <Section title="7. Transfers outside Kenya">
          <p>
            Your data is stored in Europe and some of our providers operate in other countries, so personal data
            may be transferred and processed outside Kenya. We use providers that apply contractual and technical
            safeguards, and we will rely on the transfer mechanisms that applicable law allows.
          </p>
          {/* COUNSEL: confirm which mechanism applies under the Data Protection Act 2019 and its regulations,
              and whether the EU data location triggers any additional obligations. */}
        </Section>

        <Section title="8. Security">
          <p>
            Data is encrypted in transit, and our infrastructure providers encrypt stored data. Access is
            controlled by role, and activity is logged. No system is completely secure, and we cannot guarantee
            absolute security. Please use a strong, unique password and keep it private.
          </p>
          {/* COUNSEL: add the breach-notification commitment (to the regulator and to affected firms). */}
        </Section>

        <Section title="9. Retention and deletion">
          <p>
            We keep your firm's data while its account is active. A firm can ask us to export or delete its
            data by emailing {CONTACT_EMAIL}. We will respond within a reasonable time and in line with applicable
            law. Some information may be kept longer where the law requires, or in routine backups until they
            expire.
          </p>
          {/* COUNSEL/BUSINESS: set the retention period after account closure and the response time for
              deletion and export requests. The application has no self-service export or delete yet. */}
        </Section>

        <Section title="10. Your rights">
          <p>
            Under applicable data protection law, including Kenya's Data Protection Act 2019, you may have the
            right to access your personal data, have it corrected or deleted, object to or restrict certain
            processing, and receive a copy in a portable format. To exercise these rights, email {CONTACT_EMAIL}.
            If you are a client of a law firm using LexFlow, your request may need to go to that firm, which
            decides how your data is used.
          </p>
          <p>
            You may also complain to the Office of the Data Protection Commissioner of Kenya if you believe your
            data has been mishandled.
          </p>
        </Section>

        <Section title="11. Cookies and local storage">
          <p>
            LexFlow stores a small amount of data in your browser, all of it needed for the app to work: your
            login session, your theme preference, a note that you have seen the notice about this, and, while
            you accept a team invitation, temporary sign-up details. We do not use advertising or analytics
            cookies. If that changes, we will update this policy and ask for your consent where required.
          </p>
        </Section>

        <Section title="12. Children">
          <p>LexFlow is intended for legal professionals and their clients. It is not directed at anyone under 18.</p>
        </Section>

        <Section title="13. Changes to this policy">
          <p>
            We may update this policy. We will change the date at the top and, for material changes, notify firm
            administrators.
          </p>
        </Section>

        <Section title="14. Contact">
          <p>Questions or requests about privacy: {CONTACT_EMAIL}.</p>
        </Section>
      </div>
    </div>
  );
}
