import * as React from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { AuthLayout } from "@/routes/login";
import { supabase } from "@/lib/supabase";
import { useInvitationByToken } from "@/lib/queries/invitations";

// Storage key checked by complete-setup.tsx after email confirmation, since
// signup here may not yield an immediate session (see the branch below).
const PENDING_INVITE_KEY = "lexflow-pending-invite-token";

const schema = z.object({
  fullName: z.string().min(2, "Your full name is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});
type FormValues = z.infer<typeof schema>;

export default function InvitePage() {
  const { token } = useParams({ strict: false }) as { token: string };
  const navigate = useNavigate();
  const { data: invitation, isLoading, isError } = useInvitationByToken(token);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = React.useState(false);
  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    if (!invitation) return;
    setServerError(null);

    const { data, error } = await supabase.auth.signUp({
      email: invitation.email,
      password: values.password,
    });
    if (error) {
      setServerError(error.message);
      return;
    }

    if (data.session) {
      // Auto-confirm is on for this project — accept immediately.
      const { error: acceptError } = await supabase.rpc("accept_invitation", {
        p_token: token,
        p_full_name: values.fullName,
      });
      if (acceptError) {
        setServerError(acceptError.message);
        return;
      }
      navigate({ to: "/dashboard" });
      return;
    }

    // Email confirmation required — stash the token + name so
    // complete-setup.tsx can finish the join once they confirm and log in.
    window.localStorage.setItem(PENDING_INVITE_KEY, JSON.stringify({ token, fullName: values.fullName }));
    setConfirmationSent(true);
  };

  if (isLoading) {
    return (
      <AuthLayout>
        <LoadingState label="Checking invitation…" />
      </AuthLayout>
    );
  }

  if (isError || !invitation || invitation.status !== "pending" || new Date(invitation.expires_at) < new Date()) {
    return (
      <AuthLayout>
        <ErrorState message="This invitation link is invalid, expired, or has already been used. Ask your firm admin to send a new one." />
      </AuthLayout>
    );
  }

  if (confirmationSent) {
    return (
      <AuthLayout>
        <div className="text-center">
          <h2 className="font-display text-lg font-semibold text-ink-900">Check your email</h2>
          <p className="mt-2 text-sm text-ink-500">
            Confirm your address, then sign in — you'll be added to {invitation.firm_name} automatically.
          </p>
          <Button className="mt-5 w-full" onClick={() => navigate({ to: "/login" })}>
            Go to sign in
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h2 className="mb-1 font-display text-lg font-semibold text-ink-900">Join {invitation.firm_name}</h2>
      <p className="mb-4 text-sm text-ink-500">
        You've been invited as <span className="font-medium text-ink-700">{invitation.role}</span> for{" "}
        <span className="font-medium text-ink-700">{invitation.email}</span>.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="fullName">Your full name</Label>
          <Input id="fullName" {...register("fullName")} />
          <FieldError message={errors.fullName?.message} />
        </div>
        <div>
          <Label htmlFor="password">Choose a password</Label>
          <PasswordInput id="password" autoComplete="new-password" {...register("password")} />
          <FieldError message={errors.password?.message} />
        </div>
        {serverError && <p className="text-sm text-danger">{serverError}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Joining…" : `Join ${invitation.firm_name}`}
        </Button>
      </form>
    </AuthLayout>
  );
}
