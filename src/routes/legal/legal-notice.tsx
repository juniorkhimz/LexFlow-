// Shared banner shown at the top of both legal pages. Not a component
// choice — a deliberate one: these pages must never be mistaken for
// reviewed, binding legal text. See README.md's commercial-readiness
// checklist — "Terms of Service, Privacy Policy... need a lawyer, or a
// business decision, and I can't do them" is still true after this file
// exists. This gives you a real starting STRUCTURE (the sections a legal
// SaaS handling client-privileged data typically needs to cover), not
// legal advice or a compliant document.
export function LegalNotice() {
  return (
    <div className="mb-6 rounded-md border border-warning/30 bg-warning/10 p-4 text-sm text-ink-800">
      <p className="font-medium text-warning">This is a placeholder, not a reviewed legal document.</p>
      <p className="mt-1">
        The structure below covers the sections a legal-SaaS handling client-privileged data typically needs, but
        the actual wording must be reviewed by a lawyer familiar with your jurisdiction (e.g. Kenya's Data
        Protection Act 2019, if that's your primary market) before this is shown to real customers.
      </p>
    </div>
  );
}
