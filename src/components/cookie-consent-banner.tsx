import * as React from "react";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "lexflow-cookie-consent";

// Honest about what this app actually stores client-side: no third-party
// tracking cookies exist in this codebase (no analytics installed — see
// README's commercial-readiness checklist), just localStorage for theme
// preference and Supabase's own auth session storage, both required for
// the app to function. This banner's job is disclosure, not blocking
// functionality — there's no "reject" path that breaks the app, because
// nothing here is optional tracking.
//
// Uses a plain <a>, not TanStack Router's <Link>, on purpose: this
// component is mounted in main.tsx as a SIBLING of <RouterProvider> (so it
// can show on every page, including ones the router itself might fail to
// render), which means it sits outside the router's context — <Link>
// requires that context and throws without it. A full page navigation for
// this one rarely-clicked link is a fine trade-off; it is not worth
// restructuring the provider tree to avoid.
export function CookieConsentBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!window.localStorage.getItem(CONSENT_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    window.localStorage.setItem(CONSENT_KEY, "acknowledged");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-200 bg-surface-raised p-4 shadow-lg">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-700">
          LexFlow uses essential local storage for login sessions and your theme preference — nothing else. See our{" "}
          <a href="/privacy" className="text-brass-600 hover:underline">Privacy Policy</a> for details.
        </p>
        <Button size="sm" onClick={dismiss}>Got it</Button>
      </div>
    </div>
  );
}
