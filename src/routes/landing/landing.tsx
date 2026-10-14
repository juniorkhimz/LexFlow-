import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Briefcase, CalendarClock, FileText, Menu, Receipt, Sparkles, Users, X } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { CONTACT_EMAIL } from "@/routes/legal/legal-notice";

// Brand name lives here so a rename is a one-line change.
const BRAND = "LexFlow";

const NAV = [
  ["Features", "#features"],
  ["Solutions", "#solutions"],
  ["About", "#about"],
  ["Contact", "#contact"],
] as const;

const PROBLEMS = [
  ["Scattered tools", "Spreadsheets, inboxes, calendars and paper files each hold part of the picture."],
  ["Missed follow-ups", "Deadlines and leads slip when nothing connects them to the matter they belong to."],
  ["Disconnected billing", "Quotes and invoices live apart from the work, so billing takes extra effort."],
] as const;

const FEATURES = [
  [Users, "Clients and leads", "Track leads through a pipeline, convert them to clients, and keep KYC status and history together."],
  [Briefcase, "Matter management", "One page per matter with tasks, deadlines, documents, billing and an activity log."],
  [CalendarClock, "Tasks and deadlines", "Create and complete tasks and deadlines, with critical dates flagged."],
  [FileText, "Documents", "Upload files to private storage and open them through short-lived signed links."],
  [Receipt, "Quotes and invoices", "Build line-item quotes, convert them to invoices, and record payments. Totals are calculated on the server."],
  [Sparkles, "AI insights (preview)", "A dashboard insights panel and an assistant. Insights currently run on sample data, not your firm's records."],
] as const;

const AUDIENCES = [
  ["Law firms", "Give partners, associates and staff one shared workspace with role-based access, plus a client portal."],
  ["Independent advocates", "Keep your leads, matters, deadlines and invoices in one place without heavy setup."],
  ["Growing practices", "Add team members by invitation as you grow, and track work across more matters."],
] as const;

const btn = "inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-400";
const gold = `${btn} bg-brass-500 text-ink-950 hover:bg-brass-400`;
const ghost = `${btn} border border-white/20 text-white hover:bg-white/10`;

export default function LandingPage() {
  useDocumentTitle("Legal Practice Management");
  const [open, setOpen] = useState(false);
  const [shotMissing, setShotMissing] = useState(false);
  const [heroMissing, setHeroMissing] = useState(false);

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink-950/90 backdrop-blur">
        <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-display text-lg font-semibold">{BRAND}</Link>
          <ul className="hidden items-center gap-6 text-sm text-white/70 md:flex">
            {NAV.map(([label, href]) => (
              <li key={href}><a href={href} className="hover:text-white">{label}</a></li>
            ))}
          </ul>
          <div className="hidden items-center gap-2 md:flex">
            <Link to="/login" className="px-3 text-sm text-white/80 hover:text-white">Sign In</Link>
            <Link to="/demo" className={ghost}>Book a Demo</Link>
            <Link to="/signup" className={gold}>Get Started</Link>
          </div>
          <button type="button" className="md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? <X /> : <Menu />}
          </button>
        </nav>
        {open && (
          <div className="space-y-3 border-t border-white/10 px-4 py-4 md:hidden">
            {NAV.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setOpen(false)} className="block text-white/80">{label}</a>
            ))}
            <Link to="/login" className="block text-white/80">Sign In</Link>
            <div className="flex gap-2">
              <Link to="/demo" className={ghost}>Book a Demo</Link>
              <Link to="/signup" className={gold}>Get Started</Link>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero: full-width photo behind the text. Save the photo as public/images/law-hero.jpg
            (wide, 1920px+ across). If the file is missing, the hero still works on plain navy. */}
        <section className="relative isolate flex min-h-[calc(100svh-4.5rem)] items-center overflow-hidden">
          {!heroMissing && (
            <img
              src="/images/law-hero.jpg"
              alt=""
              aria-hidden
              onError={() => setHeroMissing(true)}
              className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
            />
          )}
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 via-ink-950/80 to-ink-950/30" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-ink-950/50 md:hidden" />
          <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-ink-950 to-transparent" />

          <div className="mx-auto w-full max-w-6xl px-4 py-16 md:py-24">
            <p className="mb-5 inline-block rounded-full bg-brass-500 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-ink-950">
              Law firms · Advocates · Clients
            </p>
            <h1 className="max-w-2xl font-display text-4xl font-semibold leading-tight md:text-6xl">
              Modern Legal Practice Management, Simplified.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/80">
              Run your law firm with greater clarity and control. Manage clients, cases, deadlines, documents,
              billing and everyday legal operations from one workspace.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className={gold}>Get Started <ArrowRight size={16} aria-hidden /></Link>
              <Link to="/demo" className={ghost}>Book a Demo</Link>
            </div>
            <ul className="mt-12 grid max-w-3xl gap-3 text-sm text-brass-400 sm:grid-cols-3">
              {["Centralized case management", "Smarter deadline tracking", "Simplified billing"].map((t) => (
                <li key={t} className="rounded-md border border-white/15 bg-ink-950/40 px-4 py-3 backdrop-blur-sm">{t}</li>
              ))}
            </ul>
          </div>
        </section>

        {!shotMissing && (
          <section aria-labelledby="preview" className="mx-auto max-w-6xl px-4 pb-16">
            <h2 id="preview" className="mb-6 text-center font-display text-2xl font-semibold">
              One workspace. Better-organized legal operations.
            </h2>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#141b2b]">
              <img
                src="/screenshots/dashboard.png"
                alt={`The ${BRAND} dashboard`}
                loading="lazy"
                onError={() => setShotMissing(true)}
                className="w-full"
              />
            </div>
          </section>
        )}

        <section id="about" className="border-y border-white/10 bg-[#141b2b] py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-2 text-center font-display text-2xl font-semibold">Less juggling, more practice</h2>
            <p className="mx-auto mb-8 max-w-2xl text-center text-white/60">
              {BRAND} brings the supported workflows of a practice into one connected system.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {PROBLEMS.map(([t, d]) => (
                <div key={t} className="rounded-lg border border-white/10 p-5">
                  <h3 className="font-medium text-brass-400">{t}</h3>
                  <p className="mt-2 text-sm text-white/65">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="mb-8 text-center font-display text-2xl font-semibold">Features</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([Icon, t, d]) => (
              <article key={t} className="rounded-lg border border-white/10 p-5 transition-colors hover:border-brass-500/60">
                <Icon className="text-brass-400" aria-hidden />
                <h3 className="mt-3 font-medium">{t}</h3>
                <p className="mt-2 text-sm text-white/65">{d}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="solutions" className="border-y border-white/10 bg-[#141b2b] py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-8 text-center font-display text-2xl font-semibold">Who it's for</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {AUDIENCES.map(([t, d]) => (
                <div key={t} className="rounded-lg border border-white/10 p-5">
                  <h3 className="font-medium">{t}</h3>
                  <p className="mt-2 text-sm text-white/65">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="font-display text-3xl font-semibold">Ready to bring your practice together?</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/signup" className={gold}>Create Your Firm Account</Link>
            <Link to="/demo" className={ghost}>Book a Demo</Link>
          </div>
        </section>
      </main>

      <footer id="contact" className="border-t border-white/10 py-10 text-sm text-white/60">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-6 px-4">
          <div>
            <p className="font-display text-base text-white">{BRAND}</p>
            <p className="mt-2">Contact: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
            <p>Address: [company address to be added]</p>
          </div>
          <nav aria-label="Footer" className="flex gap-6">
            <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white">Terms of Service</Link>
            <Link to="/login" className="hover:text-white">Sign In</Link>
          </nav>
        </div>
        <p className="mx-auto mt-6 max-w-6xl px-4">© {new Date().getFullYear()} {BRAND}. All rights reserved.</p>
      </footer>
    </div>
  );
}
