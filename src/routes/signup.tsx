import { useDocumentTitle } from "@/hooks/use-document-title";
import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/lib/auth";
import { AuthLayout } from "@/routes/login";

const schema = z.object({
  firmName: z.string().min(2, "Firm name is required."),
  fullName: z.string().min(2, "Your full name is required."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});
type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  useDocumentTitle("Create your firm");
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = React.useState(false);
  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const { error } = await signUp(values);
    if (error) {
      setServerError(error);
      return;
    }
    setConfirmationSent(true);
  };

  if (confirmationSent) {
    return (
      <AuthLayout>
        <div className="text-center">
          <h2 className="font-display text-lg font-semibold text-ink-900">Check your email</h2>
          <p className="mt-2 text-sm text-ink-500">
            We've sent a confirmation link. Once confirmed, sign in to finish setting up your firm's workspace.
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
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" autoComplete="new-password" {...register("password")} />
          <FieldError message={errors.password?.message} />
        </div>
        {serverError && <p className="text-sm text-danger">{serverError}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating your workspace…" : "Create firm account"}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-ink-400">
        By creating an account, you agree to our{" "}
        <Link to="/terms" className="hover:underline">Terms of Service</Link> and{" "}
        <Link to="/privacy" className="hover:underline">Privacy Policy</Link>.
      </p>
      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-brass-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
