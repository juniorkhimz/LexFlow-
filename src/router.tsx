import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { AppShell } from "@/components/layout/app-shell";

import LoginPage from "@/routes/login";
import SignupPage from "@/routes/signup";
import ResetPasswordPage from "@/routes/reset-password";
import DashboardPage from "@/routes/dashboard";
import LeadsIndexPage from "@/routes/leads/index";
import LeadDetailPage from "@/routes/leads/lead-detail";
import ClientsIndexPage from "@/routes/clients/index";
import ClientDetailPage from "@/routes/clients/client-detail";
import MattersIndexPage from "@/routes/matters/index";
import MatterDetailPage from "@/routes/matters/matter-detail";
import TasksPage from "@/routes/tasks/index";
import DeadlinesPage from "@/routes/deadlines/index";
import AppointmentsPage from "@/routes/appointments/index";
import QuotesIndexPage from "@/routes/quotes/index";
import QuoteDetailPage from "@/routes/quotes/quote-detail";
import InvoicesIndexPage from "@/routes/invoices/index";
import InvoiceDetailPage from "@/routes/invoices/invoice-detail";
import DocumentsPage from "@/routes/documents/index";
import MessagesPage from "@/routes/messages/index";
import ReportsPage from "@/routes/reports/index";
import SettingsPage from "@/routes/settings/index";
import TrustAccountsPage from "@/routes/trust-accounts/index";
import AdminPage from "@/routes/admin/index";
import PortalPage from "@/routes/portal/index";
import CompleteSetupPage from "@/routes/complete-setup";
import InvitePage from "@/routes/invite/token";
import NotFoundPage from "@/routes/not-found";
import PrivacyPolicyPage from "@/routes/legal/privacy";
import TermsPage from "@/routes/legal/terms";

// NOTE ON ROUTING APPROACH:
// TanStack Router's file-based routing normally generates src/routeTree.gen.ts
// via `npx tsr generate`, wired through the @tanstack/router-plugin Vite
// plugin. This sandbox has no network access to install dependencies or run
// that codegen step, so hand-authoring the generated file would be
// error-prone. Code-based routing (this file) is a fully supported,
// equally-typed alternative — switch to file-based routes under src/routes/
// later if you prefer; both are first-class in TanStack Router.

const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: NotFoundPage,
});

async function requireGuest() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    throw redirect({ to: "/dashboard" });
  }
}

// The single place that checks "does this signed-in user actually have a
// profiles row yet". Every gate below (requireStaff, the index redirect,
// the portal layout) goes through this instead of querying profiles
// directly, so the missing-profile case (see complete-setup.tsx for why it
// happens) is caught everywhere, not just on some routes.
async function requireProfile() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw redirect({ to: "/login" });
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.session.user.id)
    .maybeSingle();
  if (!profile) {
    throw redirect({ to: "/complete-setup" });
  }
  return profile;
}

// Staff-only gate: signed in, has a profile, AND profile.role !== 'client'.
// Client users who land on a staff route (e.g. a bookmarked /leads URL) are
// sent to /portal — this is a UX redirect, not the security boundary. The
// actual boundary is RLS: "staff select leads" / "staff manage leads" etc.
// in supabase/migrations/0002_rls_policies.sql have no client-role branch
// at all, so even a client user whose session somehow reached this
// component would get empty results from every query, never real data.
async function requireStaff() {
  const profile = await requireProfile();
  if (profile.role === "client") {
    throw redirect({ to: "/portal" });
  }
}

// Deliberately independent of requireProfile/requireStaff — platform-admin
// status has nothing to do with any firm's profiles.role (see
// 0013_platform_admins.sql). A user could in principle be both a firm's
// staff member AND a platform admin, or neither, or just a platform admin
// with no firm profile at all — this checks only the one thing that
// matters for this route.
async function requirePlatformAdmin() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw redirect({ to: "/login" });
  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (!isAdmin) {
    throw redirect({ to: "/login" });
  }
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
    const profile = await requireProfile(); // throws its own redirect if missing
    throw redirect({ to: profile.role === "client" ? "/portal" : "/dashboard" });
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: requireGuest,
  component: LoginPage,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  beforeLoad: requireGuest,
  component: SignupPage,
});

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/privacy",
  component: PrivacyPolicyPage,
});

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/terms",
  component: TermsPage,
});

// Top-level sibling of everything else — not nested under authedLayoutRoute
// (the staff sidebar/topbar shell) or portalLayoutRoute. Gated by
// requirePlatformAdmin, a completely separate check from either of those.
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  beforeLoad: requirePlatformAdmin,
  component: AdminPage,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  component: ResetPasswordPage,
});

// Deliberately does NOT go through requireProfile — a profile existing is
// exactly what this route exists to fix. It only needs a session; if that's
// also missing, send to /login. If a profile already DOES exist (e.g. the
// user manually navigates here after finishing setup), bounce them onward
// instead of showing the form again.
// Public — no auth required to view (must work before the invitee has an
// account at all). See src/routes/invite/token.tsx.
const inviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/invite/$token",
  component: InvitePage,
});

const completeSetupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/complete-setup",
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.session.user.id)
      .maybeSingle();
    if (profile) {
      throw redirect({ to: profile.role === "client" ? "/portal" : "/dashboard" });
    }
  },
  component: CompleteSetupPage,
});

// Client-portal layout: any authenticated user WITH a profile (staff or
// client — requireProfile redirects to /complete-setup if the profile
// doesn't exist yet, same as the staff gate), no sidebar/topbar shell —
// PortalPage renders its own minimal header. Deliberately separate from the
// staff AppShell so a client user is never even shown staff nav labels.
const portalLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "portal-layout",
  beforeLoad: requireProfile,
  component: () => <Outlet />,
});

const portalRoute = createRoute({
  getParentRoute: () => portalLayoutRoute,
  path: "/portal",
  component: PortalPage,
});

// Staff shell — every child renders inside the sidebar/topbar layout and is
// gated by requireStaff (auth + non-client role).
const authedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "authed",
  beforeLoad: requireStaff,
  component: AppShell,
});

const dashboardRoute = createRoute({ getParentRoute: () => authedLayoutRoute, path: "/dashboard", component: DashboardPage });

const leadsIndexRoute = createRoute({ getParentRoute: () => authedLayoutRoute, path: "/leads", component: LeadsIndexPage });
const leadDetailRoute = createRoute({ getParentRoute: () => authedLayoutRoute, path: "/leads/$leadId", component: LeadDetailPage });

const clientsIndexRoute = createRoute({ getParentRoute: () => authedLayoutRoute, path: "/clients", component: ClientsIndexPage });
const clientDetailRoute = createRoute({ getParentRoute: () => authedLayoutRoute, path: "/clients/$clientId", component: ClientDetailPage });

const mattersIndexRoute = createRoute({ getParentRoute: () => authedLayoutRoute, path: "/matters", component: MattersIndexPage });
const matterDetailRoute = createRoute({ getParentRoute: () => authedLayoutRoute, path: "/matters/$matterId", component: MatterDetailPage });

const tasksRoute = createRoute({ getParentRoute: () => authedLayoutRoute, path: "/tasks", component: TasksPage });
const deadlinesRoute = createRoute({ getParentRoute: () => authedLayoutRoute, path: "/deadlines", component: DeadlinesPage });
const appointmentsRoute = createRoute({ getParentRoute: () => authedLayoutRoute, path: "/appointments", component: AppointmentsPage });

const quotesIndexRoute = createRoute({ getParentRoute: () => authedLayoutRoute, path: "/quotes", component: QuotesIndexPage });
const quoteDetailRoute = createRoute({ getParentRoute: () => authedLayoutRoute, path: "/quotes/$quoteId", component: QuoteDetailPage });

const invoicesIndexRoute = createRoute({ getParentRoute: () => authedLayoutRoute, path: "/invoices", component: InvoicesIndexPage });
const invoiceDetailRoute = createRoute({ getParentRoute: () => authedLayoutRoute, path: "/invoices/$invoiceId", component: InvoiceDetailPage });

const documentsRoute = createRoute({ getParentRoute: () => authedLayoutRoute, path: "/documents", component: DocumentsPage });
const messagesRoute = createRoute({ getParentRoute: () => authedLayoutRoute, path: "/messages", component: MessagesPage });
const reportsRoute = createRoute({ getParentRoute: () => authedLayoutRoute, path: "/reports", component: ReportsPage });
const settingsRoute = createRoute({ getParentRoute: () => authedLayoutRoute, path: "/settings", component: SettingsPage });
const trustAccountsRoute = createRoute({ getParentRoute: () => authedLayoutRoute, path: "/trust-accounts", component: TrustAccountsPage });

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  resetPasswordRoute,
  completeSetupRoute,
  inviteRoute,
  privacyRoute,
  termsRoute,
  adminRoute,
  portalLayoutRoute.addChildren([portalRoute]),
  authedLayoutRoute.addChildren([
    dashboardRoute,
    leadsIndexRoute, leadDetailRoute,
    clientsIndexRoute, clientDetailRoute,
    mattersIndexRoute, matterDetailRoute,
    tasksRoute, deadlinesRoute, appointmentsRoute,
    quotesIndexRoute, quoteDetailRoute,
    invoicesIndexRoute, invoiceDetailRoute,
    documentsRoute, messagesRoute, reportsRoute, settingsRoute, trustAccountsRoute,
  ]),
]);

export const router = createRouter({ routeTree, defaultNotFoundComponent: NotFoundPage });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
