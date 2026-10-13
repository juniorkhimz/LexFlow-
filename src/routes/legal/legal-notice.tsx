import type { ReactNode } from "react";

// ── Edit these two values before launch ─────────────────────────────────
// CONTACT_EMAIL must be a real, monitored address: data-protection law
// generally requires a working contact for privacy requests.
export const LEGAL_LAST_UPDATED = "13 October 2026";
export const CONTACT_EMAIL = "privacy@your-domain.com";
export const OPERATOR_NAME = "LexFlow LLP";

// Shown at the top of both legal pages until a lawyer has reviewed them.
// Remove <LegalNotice /> from privacy.tsx and terms.tsx once they have.
export function LegalNotice() {
  return (
    <div className="mb-6 rounded-md border border-warning/30 bg-warning/10 p-4 text-sm text-ink-800">
      <p className="font-medium text-warning">Draft: pending legal review.</p>
      <p className="mt-1">
        This document describes how LexFlow works today. It has not yet been reviewed by a lawyer and may change
        before launch. If you have questions, contact {CONTACT_EMAIL}.
      </p>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 font-medium text-ink-900">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function BulletList({ children }: { children: ReactNode }) {
  return <ul className="ml-5 list-disc space-y-1">{children}</ul>;
}
