import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/states";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AuthLayout } from "@/routes/login";

const PENDING_INVITE_KEY = "lexflow-pending-invite-token";

// Catches a real gap in the signup flow: when Supabase requires email
// confirmation (the default), signUp() in src/lib/auth.tsx has no session
// yet, so it can't call create_firm_and_owner (or accept_invitation) at
// signup time — those RPCs need auth.uid(), which only exists once a
// session does. The user confirms their email, logs in later, and lands
// here with a valid session but no profiles row yet. router.tsx's
// requireProfile() redirects here whenever a session exists but the
// profiles lookup comes back empty.
//
// Two paths land here:
//  1. Signed up directly (own new firm) — src/routes/signup.tsx
//  2. Signed up via an invite link (join an existing firm) —
//     src/routes/invite/token.tsx, which stashes the invite token +
//     name in localStorage before redirecting to email confirmation,
//     since there's no session yet to call accept_invitation with.
// This page checks for that stashed token first and auto-completes the
// join without asking the person to fill out a firm-name form at all.
export default function CompleteSetupPage() {
  const { session, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [checkingInvite, setCheckingInvite] = React.useState(true);
  const [joiningFirmName, setJoiningFirmName] = React.useState<string | null>(null);

  React.useEffect(() => {
    const raw = window.localStorage.getItem(PENDING_INVITE_KEY);
    if (!raw) {
      setCheckingInvite(false);
      return;
    }
    (async () => {
      try {
        const { token, fullName } = JSON.parse(raw) as { token: string; fullName: string };
        const { error } = await supabase.rpc("accept_invitation", { p_token: token, p_full_name: fullName });
        window.localStorage.removeItem(PENDING_INVITE_KEY);
        if (error) {
          setServerError(error.message);
          setCheckingInvite(false);
          return;
        }
        await refreshProfile();
        navigate({ to: "/dashboard" });
      } catch {
        window.localStorage.removeItem(PENDING_INVITE_KEY);
        setCheckingInvite(false);
      }
    })();
  }, [navigate, refreshProfile]);

  if (checkingInvite) {
    return (
      <AuthLayout>
        <LoadingState label="Finishing setup…" />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <CreateFirmForm session={session} serverError={serverError} setServerError={setServerError} refreshProfile={refreshProfile} navigate={navigate} />
      <button onClick={() => signOut()} className="mt-4 w-full text-center text-xs text-ink-400 hover:text-ink-600">
        Not you? Sign out
      </button>
    </AuthLayout>
  );
}

const schema = z.object({
  firmName: z.string().min(2, "Firm name is required."),
  fullName: z.string().min(2, "Your full name is required."),
});
type FormValues = z.infer<typeof schema>;

function CreateFirmForm({
  session, serverError, setServerError, refreshProfile, navigate,
}: {
  session: ReturnType<typeof useAuth>["session"];
  serverError: string | null;
  setServerError: (v: string | null) => void;
  refreshProfile: () => Promise<void>;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const { error } = await supabase.rpc("create_firm_and_owner", {
      p_firm_name: values.firmName,
      p_full_name: values.fullName,
      p_email: session?.user.email ?? "",
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    await refreshProfile();
    navigate({ to: "/dashboard" });
  };

  return (
    <>
      <h2 className="mb-1 font-display text-lg font-semibold text-ink-900">Finish setting up your firm</h2>
      <p className="mb-4 text-sm text-ink-500">
        Your email is confirmed — one more step to create your firm's workspace. If you were invited to join an
        existing firm, use the invite link from your invitation email instead of this form.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="firmName">Firm name</Label>
          <Input id="firmName" {...register("firmName")} />
          <FieldError message={errors.firmName?.message} />
        </div>
        <div>
          <Label htmlFor="fullName">Your full name</Label>
          <Input id="fullName" {...register("fullName")} />
          <FieldError message={errors.fullName?.message} />
        </div>
        {serverError && <p className="text-sm text-danger">{serverError}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Setting up…" : "Create firm workspace"}
        </Button>
      </form>
    </>
  );
}
