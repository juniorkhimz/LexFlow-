import { useDocumentTitle } from "@/hooks/use-document-title";
import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { Trash2, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useAuth } from "@/lib/auth";
import { useSubscription, useStartCheckout, useCancelSubscription } from "@/lib/queries/billing";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BILLING_PLANS } from "@/lib/billing-plans";
import {
  useFirm, useUpdateFirm, useFirmUsers, useUpdateUserRole,
  usePracticeAreasSettings, useCreatePracticeArea, useDeletePracticeArea, useUpdateOwnProfile,
} from "@/lib/queries/settings";
import { useInvitations, useCreateInvitation, useRevokeInvitation, useSendInvitationEmail } from "@/lib/queries/invitations";
import { usePlanLimits } from "@/lib/queries/plan-limits";
import { useAuditLog, useAuditLogEntityTypes, type AuditLogFilters } from "@/lib/queries/audit-log";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { SearchInput } from "@/components/ui/search-input";
import { formatDate } from "@/lib/utils";
import { Mail, X as XIcon } from "lucide-react";
import type { UserRole } from "@/types/database";

const ROLES: UserRole[] = ["admin", "partner", "advocate", "paralegal", "accountant", "receptionist", "client"];

const TAB_TRIGGER =
  "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-500 hover:text-ink-800 data-[state=active]:border-brass-500 data-[state=active]:text-ink-900";

function ProfileTab() {
  const { profile, refreshProfile } = useAuth();
  const updateProfile = useUpdateOwnProfile();
  const [fullName, setFullName] = React.useState(profile?.full_name ?? "");
  const [phone, setPhone] = React.useState(profile?.phone ?? "");
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  return (
    <Card>
      <CardHeader><CardTitle>Your profile</CardTitle></CardHeader>
      <CardContent className="max-w-sm space-y-3">
        <div>
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label>Email</Label>
          <p className="text-sm text-ink-500">{profile?.email}</p>
        </div>
        <div>
          <Label>Role</Label>
          <p className="text-sm capitalize text-ink-500">{profile?.role}</p>
        </div>
        {saved && <p className="text-sm text-success">Saved.</p>}
        <Button
          size="sm"
          disabled={updateProfile.isPending}
          onClick={async () => {
            await updateProfile.mutateAsync({ full_name: fullName, phone });
            await refreshProfile();
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
        >
          {updateProfile.isPending ? "Saving…" : "Save changes"}
        </Button>
      </CardContent>
    </Card>
  );
}

function FirmTab() {
  const { data: firm, isLoading, isError, refetch } = useFirm();
  const updateFirm = useUpdateFirm();
  const [form, setForm] = React.useState<{ name: string; email: string; phone: string; address: string; website: string; currency: string; tax_rate: number } | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (firm) setForm({ name: firm.name, email: firm.email ?? "", phone: firm.phone ?? "", address: firm.address ?? "", website: firm.website ?? "", currency: firm.currency, tax_rate: firm.tax_rate });
  }, [firm]);

  if (isLoading || !form) return <LoadingState />;
  if (isError) return <ErrorState message="Unable to load firm settings." onRetry={() => refetch()} />;

  return (
    <Card>
      <CardHeader><CardTitle>Firm details</CardTitle></CardHeader>
      <CardContent className="grid max-w-2xl grid-cols-2 gap-3">
        <div className="col-span-2"><Label htmlFor="name">Firm name</Label><Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label htmlFor="email">Email</Label><Input id="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><Label htmlFor="phone">Phone</Label><Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div className="col-span-2"><Label htmlFor="address">Address</Label><Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div><Label htmlFor="website">Website</Label><Input id="website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
        <div><Label htmlFor="currency">Currency</Label><Input id="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
        <div><Label htmlFor="tax_rate">Default tax rate (%)</Label><Input id="tax_rate" type="number" step="0.01" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })} /></div>
        <div className="col-span-2 flex items-center gap-3 pt-2">
          {saved && <p className="text-sm text-success">Saved.</p>}
          <Button
            size="sm"
            disabled={updateFirm.isPending}
            onClick={async () => {
              await updateFirm.mutateAsync(form);
              setSaved(true);
              setTimeout(() => setSaved(false), 2000);
            }}
          >
            {updateFirm.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InviteUserForm() {
  const createInvitation = useCreateInvitation();
  const sendInvitationEmail = useSendInvitationEmail();
  const { data: limits } = usePlanLimits();
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("advocate");
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ link: string; emailSent: boolean; emailError?: string } | null>(null);

  const seatsUsed = limits ? limits.currentStaffCount + limits.pendingStaffInvites : 0;
  const atSeatLimit = Boolean(limits?.maxStaffUsers != null && seatsUsed >= limits.maxStaffUsers);
  const inviteBlocked = role === "client" ? !limits?.clientPortal : atSeatLimit;

  const submit = async () => {
    setError(null);
    setResult(null);
    if (!email.trim()) { setError("Enter an email address."); return; }
    if (inviteBlocked) {
      setError(
        role === "client"
          ? "Your firm's plan doesn't include the client portal — upgrade in the Billing tab to invite clients."
          : "Your firm has reached its staff seat limit for its current plan — upgrade in the Billing tab to invite more.",
      );
      return;
    }
    try {
      const invitation = await createInvitation.mutateAsync({ email, role });
      const link = `${window.location.origin}/invite/${invitation.token}`;
      setEmail("");
      try {
        await sendInvitationEmail.mutateAsync(invitation.id);
        setResult({ link, emailSent: true });
      } catch (emailErr) {
        // Invitation itself was created successfully either way — email
        // sending failing (or not being configured at all, e.g. no
        // RESEND_API_KEY secret set) just means falling back to sharing
        // the link manually, not a failed invite.
        setResult({ link, emailSent: false, emailError: emailErr instanceof Error ? emailErr.message : "Unknown error" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invitation.");
    }
  };

  return (
    <div className="mb-4 max-w-lg space-y-2">
      {limits && (
        <p className="text-xs text-ink-400">
          {limits.maxStaffUsers != null
            ? `${seatsUsed} of ${limits.maxStaffUsers} staff seats used (${limits.plan} plan)`
            : `${seatsUsed} staff seats used (${limits.plan} plan — unlimited)`}
        </p>
      )}
      <div className="flex gap-2">
        <Input placeholder="colleague@firm.com" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" />
        <select className="h-9 rounded-md border border-ink-200 bg-surface-raised px-2 text-sm" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
          {ROLES.filter((r) => r !== "client" || limits?.clientPortal).map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <Button size="sm" onClick={submit} disabled={createInvitation.isPending || sendInvitationEmail.isPending || inviteBlocked}>
          <Mail className="h-4 w-4" /> Invite
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {result?.emailSent && (
        <p className="text-sm text-success">Invitation emailed. They'll land in your firm once they accept it.</p>
      )}
      {result && !result.emailSent && (
        <div className="rounded-md border border-ink-200 bg-ink-50 p-2 text-xs text-ink-700">
          Invitation created, but the email couldn't be sent{result.emailError ? ` (${result.emailError})` : ""}. Share this link directly instead:
          <br />
          <span className="break-all font-mono text-ink-900">{result.link}</span>
        </div>
      )}
    </div>
  );
}

function PendingInvitations() {
  const { data: invitations, isLoading } = useInvitations();
  const revoke = useRevokeInvitation();
  const pending = (invitations ?? []).filter((i) => i.status === "pending");

  if (isLoading || pending.length === 0) return null;

  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-400">Pending invitations</p>
      <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-surface-raised">
        {pending.map((inv) => (
          <li key={inv.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <div>
              <p className="text-ink-800">{inv.email}</p>
              <p className="text-xs text-ink-400">{inv.role} · expires {formatDate(inv.expires_at)}</p>
            </div>
            <button onClick={() => revoke.mutate(inv.id)} className="text-ink-400 hover:text-danger" aria-label="Revoke invitation">
              <XIcon className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UsersTab() {
  const { data: users, isLoading, isError, refetch } = useFirmUsers();
  const updateRole = useUpdateUserRole();

  return (
    <div>
      <InviteUserForm />
      <PendingInvitations />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Unable to load users." onRetry={() => refetch()} />
      ) : !users || users.length === 0 ? (
        <EmptyState title="No team members yet" />
      ) : (
        <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-surface-raised">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div><p className="font-medium text-ink-900">{u.full_name}</p><p className="text-xs text-ink-400">{u.email}</p></div>
              <select
                className="rounded-md border border-ink-200 bg-surface-raised px-2 py-1 text-sm"
                value={u.role}
                onChange={(e) => updateRole.mutate({ id: u.id, role: e.target.value as UserRole })}
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PracticeAreasTab() {
  const { data: areas, isLoading, isError, refetch } = usePracticeAreasSettings();
  const createArea = useCreatePracticeArea();
  const deleteArea = useDeletePracticeArea();
  const [name, setName] = React.useState("");

  return (
    <div className="space-y-4">
      <div className="flex max-w-sm gap-2">
        <Input placeholder="New practice area…" value={name} onChange={(e) => setName(e.target.value)} />
        <Button
          size="sm"
          disabled={!name.trim() || createArea.isPending}
          onClick={async () => { await createArea.mutateAsync(name.trim()); setName(""); }}
        >
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      {isLoading ? <LoadingState /> : isError ? <ErrorState message="Unable to load practice areas." onRetry={() => refetch()} /> : !areas?.length ? (
        <EmptyState title="No practice areas yet" description="Add areas like Corporate, Litigation, Family Law…" />
      ) : (
        <ul className="max-w-sm divide-y divide-ink-100 rounded-lg border border-ink-200 bg-surface-raised">
          {areas.map((a) => (
            <li key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-ink-800">{a.name}</span>
              <button onClick={() => deleteArea.mutate(a.id)} className="text-ink-400 hover:text-danger" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


function BillingTab() {
  const { data: subscription, isLoading, isError, refetch } = useSubscription();
  const startCheckout = useStartCheckout();
  const cancelSubscription = useCancelSubscription();
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = React.useState(false);

  const currentPlan = subscription?.plan ?? "free";
  const isPaid = subscription && subscription.status === "active";

  const handleSubscribe = async (planCode: string) => {
    setActionError(null);
    try {
      const url = await startCheckout.mutateAsync(planCode);
      window.location.href = url;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to start checkout.");
    }
  };

  const handleCancel = async () => {
    setActionError(null);
    try {
      await cancelSubscription.mutateAsync();
      setConfirmCancelOpen(false);
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to cancel subscription.");
    }
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Unable to load billing information." onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Current plan</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-semibold capitalize text-ink-900">{currentPlan}</p>
            <p className="text-sm text-ink-500">
              {subscription?.status ? `Status: ${subscription.status.replace("-", " ")}` : "No active subscription"}
              {subscription?.current_period_end && subscription.status === "active" && !subscription.cancel_at_period_end
                ? ` · renews ${new Date(subscription.current_period_end).toLocaleDateString()}`
                : ""}
              {subscription?.cancel_at_period_end ? " · cancels at period end" : ""}
            </p>
          </div>
          {isPaid && !subscription.cancel_at_period_end && (
            <Button size="sm" variant="outline" onClick={() => setConfirmCancelOpen(true)}>
              Cancel subscription
            </Button>
          )}
        </CardContent>
      </Card>

      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      <div>
        <p className="mb-3 text-sm font-medium text-ink-700">Available plans</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {BILLING_PLANS.map((plan) => (
            <Card key={plan.id} className={currentPlan === plan.id ? "border-brass-500" : undefined}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <p className="mt-1 text-sm font-medium text-ink-900">{plan.priceLabel}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-ink-500">{plan.description}</p>
                <ul className="space-y-1 text-sm text-ink-700">
                  {plan.features.map((f) => <li key={f}>· {f}</li>)}
                </ul>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={currentPlan === plan.id || startCheckout.isPending}
                  onClick={() => handleSubscribe(plan.planCode)}
                >
                  {currentPlan === plan.id ? "Current plan" : startCheckout.isPending ? "Redirecting…" : "Subscribe"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <p className="text-xs text-ink-400">
        Billing is handled by Paystack. Payment details are never stored by LexFlow directly.
      </p>

      <ConfirmDialog
        open={confirmCancelOpen}
        onOpenChange={setConfirmCancelOpen}
        title="Cancel your subscription?"
        description="Your plan will remain active until the end of the current billing period, then your firm will move to the Free plan and its limits."
        confirmLabel="Cancel subscription"
        destructive
        loading={cancelSubscription.isPending}
        onConfirm={handleCancel}
      />
    </div>
  );
}


function AuditLogTab() {
  const [entityType, setEntityType] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const { data: entityTypes } = useAuditLogEntityTypes();
  const { page, setPage, from, to } = usePagination();

  const filters: AuditLogFilters = { entityType, search: search || undefined, from, to };
  const { data, isLoading, isError, refetch } = useAuditLog(filters);

  React.useEffect(() => setPage(0), [entityType, search]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput className="max-w-xs" placeholder="Search actions…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="h-9 rounded-md border border-ink-200 bg-surface-raised px-3 text-sm text-ink-800" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
          <option value="all">All types</option>
          {entityTypes?.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading audit log…" />
      ) : isError ? (
        <ErrorState message="Unable to load the audit log." onRetry={() => refetch()} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState title="No activity recorded yet" description="Every create, update, conversion, and payment across the firm is logged here." />
      ) : (
        <>
          <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-surface-raised">
            {data.rows.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-ink-800">
                    <span className="font-medium">{a.profiles?.full_name ?? "System"}</span> — {a.action.replace(/\./g, " ")}
                  </p>
                  <p className="text-xs text-ink-400">{a.entity_type} · {formatDate(a.created_at, { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
                <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600">{a.entity_type}</span>
              </li>
            ))}
          </ul>
          <Pagination page={page} onPageChange={setPage} count={data.count} rowCount={data.rows.length} />
        </>
      )}
    </div>
  );
}

export default function SettingsPage() {
  useDocumentTitle("Settings");
  return (
    <div>
      <PageHeader title="Settings" description="Your profile, firm details, team roles, and practice areas." />
      <Tabs.Root defaultValue="profile">
        <Tabs.List className="mb-4 flex flex-wrap gap-1 border-b border-ink-100">
          <Tabs.Trigger value="profile" className={TAB_TRIGGER}>Profile</Tabs.Trigger>
          <Tabs.Trigger value="firm" className={TAB_TRIGGER}>Firm</Tabs.Trigger>
          <Tabs.Trigger value="users" className={TAB_TRIGGER}>Users</Tabs.Trigger>
          <Tabs.Trigger value="practice-areas" className={TAB_TRIGGER}>Practice Areas</Tabs.Trigger>
          <Tabs.Trigger value="billing" className={TAB_TRIGGER}>Billing</Tabs.Trigger>
          <Tabs.Trigger value="audit-log" className={TAB_TRIGGER}>Audit Log</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="profile"><ProfileTab /></Tabs.Content>
        <Tabs.Content value="firm"><FirmTab /></Tabs.Content>
        <Tabs.Content value="users"><UsersTab /></Tabs.Content>
        <Tabs.Content value="practice-areas"><PracticeAreasTab /></Tabs.Content>
        <Tabs.Content value="billing"><BillingTab /></Tabs.Content>
        <Tabs.Content value="audit-log"><AuditLogTab /></Tabs.Content>
      </Tabs.Root>
      {/* Notifications and Security (2FA, sessions) settings are not wired to real
          data sources yet — omitted rather than shown as dead toggles. Roles here
          (Users tab) ARE the real, RLS-enforced role assignment. Billing IS real —
          see BillingTab above, backed by Paystack via Edge Functions. */}
    </div>
  );
}
