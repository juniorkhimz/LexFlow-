import { useDocumentTitle } from "@/hooks/use-document-title";
import { LegalNotice } from "@/routes/legal/legal-notice";

export default function TermsPage() {
  useDocumentTitle("Terms of Service");
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-ink-800">
      <h1 className="mb-2 font-display text-2xl font-semibold text-ink-900">Terms of Service</h1>
      <p className="mb-6 text-ink-500">Last updated: [DATE]</p>
      <LegalNotice />

      <div className="space-y-6">
        <section>
          <h2 className="mb-1 font-medium text-ink-900">1. The service</h2>
          <p>[Describe LexFlow as a legal practice management SaaS, who can use it (law firms), and that a firm's admin agrees to these terms on behalf of their firm when creating an account.]</p>
        </section>
        <section>
          <h2 className="mb-1 font-medium text-ink-900">2. Subscriptions & billing</h2>
          <p>[Reference the actual plans in src/lib/billing-plans.ts, billing cycle, what happens on non-payment (the plan-limit gating in this app already downgrades functionality on an inactive subscription — this section should describe that behavior in plain terms), cancellation, and refund policy.]</p>
        </section>
        <section>
          <h2 className="mb-1 font-medium text-ink-900">3. Firm & user responsibilities</h2>
          <p>[Who's responsible for the accuracy of client/matter data, for managing their own team's access via the invite system, and for their own compliance obligations as a law firm — this app processes their data but doesn't practice law or advise clients.]</p>
        </section>
        <section>
          <h2 className="mb-1 font-medium text-ink-900">4. AI assistant disclaimer</h2>
          <p>[The in-app AI assistant (Gemini-backed) is general-purpose and explicitly not legal advice — this should be stated here in addition to what's shown in the chat widget itself.]</p>
        </section>
        <section>
          <h2 className="mb-1 font-medium text-ink-900">5. Data ownership & export</h2>
          <p>[Confirm the firm owns its own data and can export/delete it — standard and expected for a legal-industry tool.]</p>
        </section>
        <section>
          <h2 className="mb-1 font-medium text-ink-900">6. Limitation of liability</h2>
          <p>[Standard SaaS liability limitation language — needs a lawyer, not a template.]</p>
        </section>
        <section>
          <h2 className="mb-1 font-medium text-ink-900">7. Governing law</h2>
          <p>[Jurisdiction — likely Kenya given the KES default currency and M-Pesa support, but confirm with counsel.]</p>
        </section>
      </div>
    </div>
  );
}
