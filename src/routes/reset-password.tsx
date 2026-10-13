import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/lib/auth";
import { AuthLayout } from "@/routes/login";
import { supabase } from "@/lib/supabase";

const requestSchema = z.object({ email: z.string().email("Enter a valid email address.") });
const updateSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match.", path: ["confirm"] });

export default function ResetPasswordPage() {
  const { requestPasswordReset, updatePassword } = useAuth();
  const [mode, setMode] = React.useState<"request" | "update">("request");
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Supabase redirects back here with a recovery session already active
    // when the user clicks the emailed link.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && window.location.hash.includes("type=recovery")) {
        setMode("update");
      }
    });
  }, []);

  const requestForm = useForm<z.infer<typeof requestSchema>>({ resolver: zodResolver(requestSchema) });
  const updateForm = useForm<z.infer<typeof updateSchema>>({ resolver: zodResolver(updateSchema) });

  if (mode === "update") {
    return (
      <AuthLayout>
        <form
          className="space-y-4"
          onSubmit={updateForm.handleSubmit(async (values) => {
            const { error } = await updatePassword(values.password);
            setMessage(error ?? "Password updated. You can now sign in.");
          })}
        >
          <div>
            <Label htmlFor="password">New password</Label>
            <PasswordInput id="password" autoComplete="new-password" {...updateForm.register("password")} />
            <FieldError message={updateForm.formState.errors.password?.message} />
          </div>
          <div>
            <Label htmlFor="confirm">Confirm password</Label>
            <PasswordInput id="confirm" autoComplete="new-password" {...updateForm.register("confirm")} />
            <FieldError message={updateForm.formState.errors.confirm?.message} />
          </div>
          {message && <p className="text-sm text-ink-600">{message}</p>}
          <Button type="submit" className="w-full" disabled={updateForm.formState.isSubmitting}>
            Update password
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form
        className="space-y-4"
        onSubmit={requestForm.handleSubmit(async (values) => {
          const { error } = await requestPasswordReset(values.email);
          setMessage(error ?? "Check your email for a password reset link.");
        })}
      >
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...requestForm.register("email")} />
          <FieldError message={requestForm.formState.errors.email?.message} />
        </div>
        {message && <p className="text-sm text-ink-600">{message}</p>}
        <Button type="submit" className="w-full" disabled={requestForm.formState.isSubmitting}>
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  );
}
