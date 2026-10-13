# LexFlow

Legal practice management platform. React 19 + TypeScript + Vite + TanStack
Router + TanStack Query + Tailwind v4 + Radix UI + Supabase.

## Setup

```bash
npm install
cp .env.example .env   # then fill in your Supabase project URL + publishable key
npm run supabase:migrate   # or paste supabase/migrations/*.sql into the Supabase SQL editor, in order
npm run dev
```

Requires a Supabase project. Create one at supabase.com, then from
**Project Settings → API** copy:
- `VITE_SUPABASE_URL` — the Project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — the `anon` / publishable key (never the `service_role` key)

Run the six migration files in `supabase/migrations/` **in numeric order** —
later ones (billing triggers, the quote→invoice RPC) depend on tables and
functions created earlier.

## What's implemented

**Foundation** — Vite + React 19 + TS strict mode + path aliases, Tailwind v4
via `@tailwindcss/vite` with a legal-SaaS ink/brass token set, a validated
Supabase client, and a full relational schema: 19 tables, foreign keys,
indexes, RLS on every table, a private document storage bucket with its own
policies, and server-side triggers that compute quote/invoice line totals
and payment status — client-sent totals are never trusted.

**Auth** — sign up (atomically creates firm + admin profile via RPC), sign
in/out, forgot/reset password, session persistence, protected routes, and a
staff-vs-client role gate that routes each user to the right app surface.

**Every sidebar module is a real, working CRUD surface against Supabase, not a mock:**
- **Dashboard** — live KPIs, lead-pipeline and matters-by-practice-area charts, recent activity, upcoming deadlines, quick actions
- **Leads** — CRM with search/status filter, detail page, inline status updates, atomic convert-to-client, activity log, delete
- **Clients** — CRUD, KYC status, tabbed detail (matters/documents/quotes/invoices/payments/appointments/activity)
- **Matters** — table + card views, tabbed detail (overview/tasks/deadlines/documents/billing/notes/activity)
- **Tasks** — create, complete, filter, delete
- **Deadlines** — create, complete, critical deadlines visually flagged
- **Appointments** — book, associate client/lead/matter, status lifecycle, cancel
- **Quotes** — line-item builder, server-computed totals, send/accept/reject, duplicate, atomic convert-to-invoice (RPC)
- **Invoices** — line items, record payments, server-tracked balance/status via triggers
- **Documents** — real upload to private Supabase Storage, signed-URL download, rename, delete
- **Messages** — client-linked threads, real send/receive
- **Reports** — 7 real aggregate queries/charts: revenue, outstanding invoices, quote/lead conversion, advocate workload, matter status, new clients
- **Settings** — profile, firm details, user roles, practice areas (Notifications/Billing/Security sub-tabs intentionally omitted — see below)
- **Client Portal** (`/portal`) — separate shell, RLS-restricted to the caller's own client record: matters, documents, quotes, invoices, appointments, messages

Reusable UI kit: PageHeader, StatusBadge, DataTable, EmptyState/LoadingState/ErrorState,
ConfirmDialog, SearchInput, form fields, PasswordInput (show/hide toggle), LineItemEditor, CurrencyDisplay/DateDisplay, ActivityTimeline.

## Deliberately left out (not mocked, just not built)

- **Settings → Notifications / Billing / Security tabs** — no real backing
  data source was in scope, so rather than show toggles wired to nothing
  they're simply not rendered. Users, Firm, and Practice Areas tabs are
  fully real.
- **M-Pesa API integration** — payments support `mpesa` as a recorded
  method, but there's no live Daraja API call; per the original brief this
  is deliberately deferred, and the schema (`payments.reference`) is ready
  for it.
- **Global search** debounces client-side and queries 5 tables directly;
  fine at current scale, would move to a Postgres full-text index or an
  Edge Function if result volume grows.

## Known deviations from the original brief (and why)

- **TanStack Start is not wired in** — only `@tanstack/react-router` as a
  client-rendered SPA. Start needs its own SSR entry files that couldn't be
  verified without a real dev-server run in the sandbox this was built in.
- **Routes are code-based** (`src/router.tsx`), not file-based-with-codegen,
  for the same reason — `npx tsr generate` wasn't runnable here. Both are
  first-class in TanStack Router; migrate to file conventions if you prefer.
- **`src/types/database.ts` is hand-written**, matching the SQL migrations.
  Once linked to a live Supabase project, regenerate it:
  `supabase gen types typescript --linked > src/types/database.ts`.
- **No `npm install` / `npm run build` / `npx tsc --noEmit` has been run**
  against this code — no network access in the build sandbox. Run all three
  yourself before deploying; report back anything that fails.

## Subscriptions (Paystack)

The `subscriptions` table (`0008_subscriptions.sql`, extended by
`0014_paystack_billing.sql`) tracks each firm's paid plan for LexFlow
itself — separate from the invoices a firm sends its own clients. Paystack
is the single source of truth: the table is never client-writable (RLS
grants read-only, admins/partners only), only the `paystack-webhook` Edge
Function can write it.

**Why Paystack and not Stripe**: Stripe does not support Kenya as an
account country — using it from Kenya would require incorporating a
business in a supported country (commonly a US LLC via a service like
Stripe Atlas), obtaining a US EIN, and opening a US bank account for
payouts. That's a real legal/business undertaking, not a quick setup step,
so this project uses Paystack instead — it's owned by Stripe but a
genuinely separate platform that operates directly in Kenya, with native
M-Pesa support.

**One real capability difference from Stripe, stated plainly**: Paystack
has no hosted self-service billing portal. Where Stripe would redirect a
firm to a Stripe-hosted "manage your subscription" page, this app instead
has a direct **Cancel subscription** button (Settings → Billing) that
calls Paystack's API server-side. There's currently no self-service
"update payment method" or "view past invoices" flow — a firm resubscribes
if their card fails, rather than updating it in-app. Worth knowing before
you rely on this for real customers.

**Setup:**
1. Create a [Paystack](https://paystack.com) account (works with a Kenyan business/individual — this is the whole reason for using it over Stripe).
2. In the Dashboard → Products → Plans, create a Plan for each tier (e.g. Starter/Pro/Enterprise, monthly billing interval).
3. Copy each Plan code (`PLN_...`) into `src/lib/billing-plans.ts`.
4. Also map those same Plan codes to plan names in `planFromPlanCode()` inside `supabase/functions/paystack-webhook/index.ts`.
5. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) if you haven't, then link your project: `supabase link --project-ref your-project-ref`
6. Set the Edge Function secret (server-side only, never in `.env`):
   ```bash
   supabase secrets set PAYSTACK_SECRET_KEY=sk_test_...
   ```
   (`SUPABASE_SERVICE_ROLE_KEY` doesn't need setting manually — Supabase injects it into every Edge Function automatically.)
7. Deploy the three billing functions:
   ```bash
   supabase functions deploy paystack-initialize-transaction
   supabase functions deploy paystack-cancel-subscription
   supabase functions deploy paystack-webhook --no-verify-jwt
   ```
8. In the Paystack Dashboard → Settings → API Keys & Webhooks, set the Webhook URL to your deployed `paystack-webhook` function URL.
9. Run migration `0014_paystack_billing.sql` if you haven't yet (adds the Paystack-specific columns and updates the subscription status vocabulary).
10. Test with Paystack's [test cards](https://paystack.com/docs/payments/test-payments) before going live.

**One thing to verify yourself during testing, flagged honestly rather than asserted with false confidence**: the webhook's firm-resolution logic (matching a Paystack event back to the correct LexFlow firm) relies on `metadata.firm_id` being reliably present on the `charge.success` event, which is documented Paystack behavior — but whether `metadata` also propagates onto the separate `subscription.create` event wasn't something this session could verify with certainty against live Paystack traffic. The webhook has a fallback (matching by customer email against `profiles.email`), but test the full subscribe flow once with a real test transaction and confirm a `subscriptions` row actually gets created correctly before relying on this.

The **Settings → Billing** tab calls these functions to start checkout / cancel a subscription. Only `admin`/`partner` roles can manage billing (enforced both client-side and inside the Edge Functions).

## AI Assistant (Gemini)

A floating chat widget (bottom-right, staff app only) proxies through the
`gemini-chat` Edge Function so the Gemini API key never reaches the
browser. It's deliberately a general-purpose assistant with **no access to
firm data** (leads, clients, matters, documents) — see the comment at the
top of `supabase/functions/gemini-chat/index.ts` for why, and what wiring
it to firm data would require if you want to take that on later.

**Setup:**
1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Set the secret: `supabase secrets set GEMINI_API_KEY=your_key`
3. Deploy: `supabase functions deploy gemini-chat`

Optionally pin a specific model version instead of Google's auto-updating
"latest" alias: `supabase secrets set GEMINI_MODEL=gemini-2.5-flash` (check
[the current model list](https://ai.google.dev/gemini-api/docs/models) —
Google's lineup changes frequently and older models get shut down on
several-month notice).

## AI Gateway (matter-context AI — currently safe by construction, not by flag)

A second, separate Edge Function — `ai-gateway` — exists for AI features
that need to see a matter's actual content (a "matter copilot": summaries,
"ask this matter about X"). This is architecturally distinct from
`gemini-chat` above on purpose: `gemini-chat` never has data access and
never will; `ai-gateway` is the single, auditable place where that
question gets decided, once, rather than answered differently by every
future feature that wants AI context.

**The current state is deliberate, not a placeholder to "finish later":**
- Every request is authorization-checked first, in every mode, via a real RLS-scoped query — proven correct right now, independent of whether any AI mode is even active
- Every request is logged to `activities` for audit visibility
- `AI_MATTER_CONTEXT_MODE` controls what happens next: `disabled` (the default if the secret is never set — no Gemini call happens at all) or `synthetic` (runs the real prompt pipeline against a fixed, clearly-fake sample matter, so the feature is fully testable and demoable with zero privacy exposure)
- **There is no "live" mode implemented.** Not hidden behind a flag that could be flipped by mistake — the function that would fetch a real matter's real content and send it to Gemini (`getLiveMatterContext()` in `supabase/functions/ai-gateway/index.ts`) is a stub that throws. This is the strongest guarantee available: code that doesn't exist cannot leak privileged data.

**What implementing live mode would actually require, before it's a good idea, not just a technical possibility:**
- A redaction/minimization strategy — does the whole matter go to Gemini, or a filtered subset?
- Client disclosure — attorney-client privileged material leaving your infrastructure for a third-party model is something clients arguably have a right to know about
- Explicit logging of exactly what was sent, not just that a request happened
- Legal sign-off given what's at stake — this is a business/legal decision, not a code review

**Try it now (safe):** on a Matter's detail page, the **AI Assistant** tab lets you click "Summarize this matter" or ask a free-text question. With `AI_MATTER_CONTEXT_MODE=synthetic` set, you'll get a real Gemini response about a fixed sample matter, with an unmissable warning banner above the response confirming it's demo data — never your real matter's content, regardless of which real matter you're viewing when you click it.

**Setup**: `supabase secrets set AI_MATTER_CONTEXT_MODE=synthetic` (uses the same `GEMINI_API_KEY` as `gemini-chat`), then `supabase functions deploy ai-gateway`.

## Deploying Edge Functions locally for testing

Before deploying, you can run functions locally:
```bash
supabase functions serve
```
This requires Docker Desktop running. Local testing still needs the same
secrets — create `supabase/.env.local` (gitignored) with the same keys for
local runs, per the [Supabase Edge Functions docs](https://supabase.com/docs/guides/functions/secrets).



## Adding teammates (invitations)

Every signup used to create a brand-new firm — there was no way for a
second person at the same firm to join it. Fixed via `0009_invitations.sql`:

1. **Settings → Users** (admin/partner only) → enter a colleague's email and role → "Invite"
2. If email sending is configured (below), they get a real email with a link. If not, the invite link is shown directly in the UI to copy/share yourself — invite creation always succeeds either way; email delivery is a separate, non-blocking step.
3. They open the link (`/invite/<token>`), see which firm and role they're being added to, set a password, and land in **your** firm with the assigned role — not a new one

The invitation is validated against the invited email address, expires after 7 days, and can be revoked from the same screen before it's used.

**Setup for real email delivery (Resend):**
1. Create a free account at [resend.com](https://resend.com)
2. Get an API key (Dashboard → API Keys)
3. Set it: `supabase secrets set RESEND_API_KEY=re_your_key`
4. Deploy: `supabase functions deploy send-invitation-email`
5. **Important**: without your own verified sending domain, Resend's shared test sender can only deliver to the email on your own Resend account — fine for testing the flow yourself, not for inviting real colleagues. To actually email real people, verify a domain in the Resend dashboard, then set: `supabase secrets set INVITE_FROM_EMAIL="LexFlow <invites@yourdomain.com>"`

## CSV import (onboarding)

Previously a new firm signed into a completely empty app with no path to
bring in existing clients/matters short of manual re-entry. **Leads,
Clients, and Matters** each now have an "Import CSV" button (next to "New
Lead" / "New Client" / "New Matter") that:

1. Parses the uploaded CSV with PapaParse (handles quoted fields, embedded commas — the kind of thing a hand-rolled CSV parser gets subtly wrong on real Excel exports)
2. Auto-guesses a column mapping by matching CSV headers to field names/labels, with a manual override dropdown per column
3. Validates every row (required fields, email format, numeric fields, dates) before import — invalid rows are skipped and reported with a reason, valid rows still import (partial success, not all-or-nothing)
4. Bulk-inserts in chunks of 200 for Leads/Clients (fast). **Matters import one row at a time instead** — matters have a unique `(firm_id, matter_number)` constraint, and one duplicate in a batch insert would silently abort the *entire* batch with no per-row detail; one-at-a-time trades some speed for actually-useful per-row error messages, which matters more for a constraint this easy to accidentally violate (e.g. two rows with the same matter number)
5. Logs one `activities` entry per import (not per row) so the audit log isn't spammed by a 500-row import

**Matters import depends on Clients already existing** — a matter references its client by name (there's no way someone exporting from Excel would have your internal client UUIDs), resolved via case-insensitive exact match against the firm's existing clients at import time. Import Clients first, then Matters.

**Deliberately not done**: document bulk-upload (CSV import is for structured *rows*; documents are files, a different problem — worth its own feature if wanted), and no "undo import" — a mis-mapped import currently needs manual cleanup or deletion of the affected rows.



Password reset, email confirmation, and magic-link emails are sent by
**Supabase Auth's own built-in email system** — separate from the Resend
integration built for invitations above, and not something app code
controls at all. Supabase's default sender is rate-limited (a handful of
emails per hour) and meant for testing, not real users signing up and
resetting passwords.

**Fix — point Supabase Auth at the Resend account you already set up**, no new service needed:
1. In Resend, go to **SMTP** (Dashboard → SMTP) and copy the SMTP credentials (host, port, username, password) — Resend exposes your API key as the SMTP password
2. In Supabase Dashboard → **Project Settings → Authentication → SMTP Settings**, enable "Custom SMTP" and enter those credentials, with the sender address set to a verified address on your Resend domain
3. Save — from then on, every Supabase Auth email (signup confirmation, password reset, etc.) sends through Resend instead of Supabase's limited default

This needs the same verified-sending-domain caveat noted in the Invitations section above: Resend's shared test sender only works for your own account's email until you verify a domain.

## Plan-based feature gating

Previously the Billing tab showed a plan but enforced nothing. `0010_plan_limits_and_gating.sql` closes this with real, database-level limits — not just a UI suggestion:

- `plan_limits` table defines seat count and client-portal access per tier (`free`: 1 staff seat, no portal · `starter`: 5 seats · `pro`: 25 seats + portal · `enterprise`: unlimited + portal) — edit this table directly in SQL to change your own tiers, it's platform config, not something firms control
- Enforced at the actual write path: the `invitations` table's INSERT policy checks the firm's current plan before allowing a new staff invite or a client-portal invite to be created at all — hitting the limit fails at the database, not just in the UI
- Also re-checked inside `accept_invitation()` as a safety net, in case a firm's plan changes in the days between sending an invite and it being accepted
- The frontend (`usePlanLimits` hook, used in Settings → Users) shows "3 of 5 seats used" and disables inviting past the limit with a clear message — this is a nicer front door to the same rule, not a separate one; the database would still refuse it even if this check were bypassed

**Keep three places in sync when you change plan definitions**: `plan_limits` table, `subscriptions.plan`'s CHECK constraint (`0008_subscriptions.sql`), and `src/lib/billing-plans.ts` on the frontend. This is a known tradeoff of not having one generated source of truth for all three — documented here rather than left as a silent trap.

## Demo data

`supabase/seed-demo-data.sql` populates one firm with realistic sample
leads, clients, matters, tasks, deadlines, appointments, a quote, and two
invoices (one partially paid) — so a demo doesn't start from a blank
dashboard. It's commented with exact steps; short version:

1. Sign up in the app and create your firm first
2. Find its ID: `select id, name from firms order by created_at desc limit 5;`
3. Edit the script's `v_firm_id` placeholder with that value
4. Run the whole script in the SQL Editor
5. Refresh the app

## Platform admin panel

A firm's `admin` role is scoped to their own firm by RLS, everywhere. A
**platform admin** — someone who works for you, the SaaS operator, not any
customer — needs to see across every firm, which is a fundamentally
different privilege domain. Until now the only way to do that was raw SQL
in the Supabase dashboard. `0013_platform_admins.sql` + `/admin` close this
properly, without a blanket "bypass RLS for admins" policy anywhere (a much
larger, harder-to-audit hole than the narrow approach taken here):

- `platform_admins` is its own table, unrelated to any `firm_id` — its RLS policy only ever lets someone check **their own** membership, never list others or see firm data through it directly
- Actual cross-firm reads happen through exactly one Edge Function, `admin-firms-overview`, which re-verifies platform-admin status server-side (never trusts the frontend route guard) before using the service-role key to read across all firms
- `/admin` is its own top-level route — no staff sidebar, no client-portal chrome, structured so it could be split into a genuinely separate deployment later with minimal rework (it already only talks to one Edge Function, nothing shared with the rest of the app's component tree)

**Adding yourself as a platform admin** (SQL only, deliberately — matches how `plan_limits` is edited):
```sql
insert into platform_admins (id, full_name) values ('<your auth.users.id>', 'Your Name');
```
Find your `auth.users.id` via: `select id, email from auth.users where email = 'you@example.com';`

**Deliberately not modeled**: live Stripe revenue totals (the panel reads `subscriptions.plan`/`status` from this app's own database, not a live Stripe API call — for actual revenue, use the Stripe Dashboard directly), impersonating a firm's login, or editing any firm's data from this panel. All of those are real features a production admin panel would eventually want, kept out here to keep the first version narrow and auditable rather than a broad "do anything to any firm" tool.

## Trust accounting

Added after researching actual Kenya-market competitors (WakiliCMS, EliteLaw,
Sheriasoft, and others) — this closed a real, specific gap rather than a
guessed one: EliteLaw explicitly advertises "compliant trust accounting" as
a differentiator, and this app didn't have it at all until now.

Trust accounting tracks money a firm holds **on a client's behalf**
(retainers, settlement funds) — separately from the firm's own operating
funds, per client, with one hard rule: a firm can never disburse or
transfer more of a specific client's trust money than that client actually
has on deposit, even if the firm's total trust account balance across all
clients is higher. This is the core rule behind IOLTA-style trust
accounting requirements most bar associations enforce, not a cosmetic
feature — see `0012_trust_accounting.sql`'s `enforce_trust_balance_nonnegative()`
trigger, which is the actual enforcement (not just a UI check).

**Sidebar → Trust Accounts**: shows every client with a nonzero trust
balance, a running per-client ledger (deposits, disbursements, transfers to
the firm's operating account), and a "Record transaction" flow that
surfaces the database's own rejection message verbatim if an entry would
overdraw a client's balance, rather than a generic error.

**Deliberately not modeled**: automatic reconciliation against a real bank
statement, or the specific reporting format a bar association's trust
account audit might require (e.g. LSK-specific formats, which EliteLaw also
advertises) — that needs domain input from someone who's actually filed one
of these reports, not a guess.

## Launch checklist (favicon, meta tags, 404, legal pages, etc.)

Cross-referenced against a generic "20 things that make a site real" launch
checklist. Honest breakdown of what applies to an authenticated SaaS app
(not a marketing site) and what was actually done:

**Closed:**
- Custom 404 page (`src/routes/not-found.tsx`, wired as the router's `notFoundComponent`)
- Per-page `<title>` (`useDocumentTitle` hook, used across all major routes)
- Meta description + Open Graph tags (`index.html`)
- Favicon (`public/favicon.svg`)
- `robots.txt` — deliberately `Disallow: /` — see the file's own comment for why that's correct here, not an oversight
- Privacy Policy and Terms of Service pages exist and are linked from signup (`/privacy`, `/terms`) — **structural placeholders only**, clearly banner-labeled as not legally reviewed. I can build the page and the section headings a legal SaaS needs; I cannot write binding legal text for you.
- A lightweight, honest cookie/local-storage consent banner (`src/components/cookie-consent-banner.tsx`) — discloses exactly what's stored (session + theme preference) and needs updating the day analytics or any tracking cookie gets added

**Deliberately not done, because they're marketing-landing-page concepts and this isn't one** (the root `/` route requires login and redirects straight to the dashboard or portal — there's no public marketing page in this codebase at all): CTA above the fold, sitemap.xml, sticky mobile CTA. A future public marketing/pricing page, if you build one, would want all three.

**Not applicable currently, revisit if the situation changes:** alt text (no photography in the app currently — Lucide icons and text avatars only), compressed images (same reason — add real compression tooling once a logo/OG image exists).

**Still needs you, not code:** analytics (needs a provider chosen and a decision about what's ethical/legal to track on a legal-industry tool), a real contact address for the Privacy Policy footer, and — the big one — actual legal review of the Terms/Privacy placeholder content before a real customer ever sees it.

## Commercial readiness — honest status

What follows is a candid checklist, split by what code can and can't fix.

**Closed in this pass:**
- ✅ Multiple people per firm (invitations, above)
- ✅ The "signed up but no profile" dead-end (`/complete-setup`)
- ✅ Billing-manipulation integrity gap (negative quantity/discount constraints)
- ✅ Subscriptions wired to real Stripe Checkout + webhooks
- ✅ AI assistant wired to Gemini, scoped deliberately (no firm data access)
- ✅ Transactional email for invitations (Resend), with graceful fallback to a manual link if unconfigured
- ✅ Plan-based feature gating (seat limits, client-portal access) enforced at the database level, not just the UI
- ✅ Storage quota gating (document count + total size per plan), same enforcement pattern
- ✅ Audit log UI (Settings → Audit Log) — the `activities` table has captured every action since the start; this is the first screen to actually browse it firm-wide, with filtering and pagination

**Real gaps that are still code-shaped (I can keep closing these):**
- No plan-based feature gating beyond seats/portal/storage — other conceivable limits (API rate limits) aren't modeled
- Test coverage exists but is intentionally narrow (see "Automated tests" below) — no integration or e2e tests, only unit/component tests on the highest-risk pure logic

## Automated tests

Previously zero. Now a real Vitest + Testing Library setup with tests on
the highest-financial-risk logic first, not blanket coverage for its own
sake:

- `src/lib/billing-math.test.ts` — the quote/invoice line-total formula, extracted from `line-item-editor.tsx` into its own testable module (`src/lib/billing-math.ts`) specifically so it could be tested at all. Explicitly documented as needing to stay in sync with `set_line_total()` in `0005_billing_triggers.sql` — the SQL trigger is still the actual source of truth, this test just catches drift in the client-side preview math.
- `src/lib/utils.test.ts` — currency/date formatting, class-name merging
- `src/components/ui/status-badge.test.tsx` — including a test for what happens with a status value that isn't in `TONE_MAP` (a real risk: someone adds a new Postgres enum value and forgets to map it here — should degrade gracefully, not crash)
- `src/components/ui/password-input.test.tsx` — the show/hide toggle built earlier
- `src/components/ui/pagination.test.tsx` — next/prev button logic across all its branches (exact count from Supabase vs. the row-count fallback when count isn't available)

**Run tests**: `npm run test` (single run) or `npm run test:watch` (watch mode).

**Deliberately not done**: integration tests hitting a real (or mocked) Supabase instance, and end-to-end tests (Playwright/Cypress) driving the actual browser. Both are valuable and worth adding — this pass specifically targeted pure logic and component behavior that was both easy to get subtly wrong and completely unverified until now, not full coverage.

**Not code — these need YOU, a lawyer, or a business decision, and I can't do them:**
- Terms of Service, Privacy Policy, and (given this handles client-privileged legal data) a real assessment of what data-protection law applies in your target market (Kenya's Data Protection Act 2019, if that's the primary market) — a real law firm customer will ask about this before they trust it with client data
- A support channel (even just a monitored email) and an incident/outage communication plan
- A backup and disaster-recovery runbook — Supabase does automated backups on paid tiers, but you need a tested restore process, not just "it probably works"
- Payment processor compliance — Stripe is currently in **test mode**; going live requires your own Stripe business verification, which Stripe (not this app) handles
- Actual usage with real users. Nothing here has been used by anyone except through this conversation — the biggest remaining risk isn't a missing feature, it's the first real law firm hitting a workflow nobody thought to test

**My honest read**: this is now a genuinely capable MVP with real multi-tenant isolation, a working invite flow, real billing, and a working AI feature — good enough to onboard a friendly first customer who understands it's early. It is not yet "market it broadly and expect trust with real client data at scale" — that gap is entirely the non-code list above, not more features.

## Deployment

This is a client-rendered SPA (see the Vite config's note on why — TanStack
Start/SSR wasn't wired in). It builds to static files and can be hosted on
Vercel, Netlify, Cloudflare Pages, or any static host — the app itself
talks directly to Supabase from the browser, there's no separate backend
server to deploy beyond the Edge Functions already covered above.

**Before deploying, run through this checklist — every item here is
something that would silently break in production if skipped:**

1. **Build it locally first and actually check the output**:
   ```bash
   npm run build
   npm run preview
   ```
   Click through a few routes in the preview server. `npm run build` succeeding is not the same as the app working — this project hasn't had `npm install`/`npm run build` run against it even once in the environment that produced it (see "Known deviations" above); the first real build is a genuine unknown until you do it.

2. **SPA routing rewrite — already configured, but confirm your host uses it.** `vercel.json` and `netlify.toml`/`public/_redirects` are both included so any route (e.g. `/leads/abc123`) serves `index.html` instead of 404ing on refresh or direct navigation — a real bug that would otherwise only show up once real users start bookmarking or refreshing deep links, not during local dev (where Vite's dev server already handles this transparently, masking the issue).

3. **Environment variables — set these in your hosting platform's dashboard, not from a committed file** (`.env` is gitignored and never gets deployed):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

   Both are safe to expose to the browser (see Security notes below) — that's the entire point of the `VITE_` prefix and the publishable/anon key. Nothing else needs setting on the frontend host; Stripe/Paystack/Gemini/Resend secrets all live as **Supabase Edge Function secrets** (`supabase secrets set ...`), never here.

4. **All 14 migrations run against your production Supabase project**, in order, the same way as local — this is a separate step from deploying the frontend. A fresh production Supabase project has none of this schema until you run them.

5. **All 7 Edge Functions deployed**: `admin-firms-overview`, `gemini-chat`, `send-invitation-email`, `paystack-initialize-transaction`, `paystack-cancel-subscription`, `paystack-webhook` (with `--no-verify-jwt`), and their secrets set — each covered in its own README section above with exact commands.

6. **Paystack webhook URL updated** to point at your production Supabase project's function URL (it's project-specific — a webhook registered against a local/dev Supabase project won't fire for production traffic).

7. **Update `robots.txt`'s reasoning if it ever stops being true.** It currently disallows all crawling, which is correct for an authenticated app with no public marketing pages (see the Launch Checklist section) — if you ever add a public marketing/pricing page, that decision needs revisiting, not just copied forward.

8. **Run the test suite** (`npm run test`) as part of your deploy process, not just locally on demand — catching a billing-math regression before it ships matters more in production than it does in development.

**Not set up, and worth knowing before you rely on this being "done":**
- No CI/CD pipeline (GitHub Actions or similar) wired up — deploys are manual (`git push` to whatever your host auto-deploys from, or a manual `vercel`/`netlify deploy`) unless you set that up yourself
- No staging environment — this checklist assumes one production Supabase project and one production frontend deploy; a real production workflow usually wants a separate staging Supabase project to test migrations against before running them for real
- No error tracking (Sentry or similar) — a production error currently only surfaces in whatever the user tells you, or browser console logs you'll never see. Genuinely worth adding before real customers use this.



- RLS is the actual enforcement boundary (`supabase/migrations/0002_rls_policies.sql`),
  not just frontend checks. Every table is scoped by `firm_id`; client users
  see only rows linked to their own `clients.id` via `auth_client_ids()`.
  `requireStaff` in `src/router.tsx` is a UX redirect on top of that, not
  the boundary itself.
- The `documents` storage bucket is private; always fetch via
  `supabase.storage.from('documents').createSignedUrl(...)`, never a public URL.
- Quote/invoice totals and invoice payment status are computed by Postgres
  triggers (`0005_billing_triggers.sql`), never trusted from client input.
- The service-role key must never appear in this codebase or any `VITE_`-prefixed env var. It's used server-side only inside Edge Functions, as a Supabase secret.
- Stripe and Gemini API keys are Edge Function secrets only — never in `.env`, never `VITE_`-prefixed, never in the browser bundle. `subscriptions` table writes are restricted to the service-role webhook by RLS; no client role (not even `admin`) can write it directly.
