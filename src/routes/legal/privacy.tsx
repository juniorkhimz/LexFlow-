import { useDocumentTitle } from "@/hooks/use-document-title";
import { LegalNotice } from "@/routes/legal/legal-notice";

export default function PrivacyPolicyPage() {
  useDocumentTitle("Privacy Policy");
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-ink-800">
      <h1 className="mb-2 font-display text-2xl font-semibold text-ink-900">Privacy Policy</h1>
      <p className="mb-6 text-ink-500">Last updated: [DATE]</p>
      <LegalNotice />

      <div className="space-y-6">
        <section>
          <h2 className="mb-1 font-medium text-ink-900">1. What we collect</h2>
          <p>
            [Describe: account/profile data (name, email), firm data (business details), and — specific to a legal
            practice tool — the client/matter/document data your firm enters, which may include privileged or
            confidential information belonging to your clients.]
          </p>
        </section>
        <section>
          <h2 className="mb-1 font-medium text-ink-900">2. How we use it</h2>
          <p>[Describe: providing the service, billing via Paystack, sending invitation/transactional email via Resend, AI assistant queries via Google Gemini — and critically, what is and is NOT sent to any third party.]</p>
        </section>
        <section>
          <h2 className="mb-1 font-medium text-ink-900">3. Third-party processors</h2>
          <p>[List: Supabase (database, auth, storage, hosting), Paystack (payments), Resend (email), Google Gemini (AI assistant — note in this app's case it does not receive firm data, see the AI Assistant section of the technical README). Each of these needs its own data processing agreement reference.]</p>
        </section>
        <section>
          <h2 className="mb-1 font-medium text-ink-900">4. Client-privileged data</h2>
          <p>[This is the section that matters most for a legal-practice tool specifically — how attorney-client privileged material entered by firms is protected, who can access it, and what your obligations are as a processor vs. the firm as data controller of their own clients' information.]</p>
        </section>
        <section>
          <h2 className="mb-1 font-medium text-ink-900">5. Data retention & deletion</h2>
          <p>[Describe retention periods and how a firm can request deletion of their data if they close their account.]</p>
        </section>
        <section>
          <h2 className="mb-1 font-medium text-ink-900">6. Your rights</h2>
          <p>[Rights under applicable law — access, correction, deletion, portability — and how to exercise them.]</p>
        </section>
        <section>
          <h2 className="mb-1 font-medium text-ink-900">7. Contact</h2>
          <p>[Real contact address/email for privacy inquiries — required by most data protection laws, and item #19 on any legitimate launch checklist for exactly this reason.]</p>
        </section>
      </div>
    </div>
  );
}
