import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useDocumentTitle } from "@/hooks/use-document-title";

type Status = "idle" | "sending" | "done" | "error";
const field = "mt-1 w-full rounded-md border border-white/20 bg-[#141b2b] px-3 py-2 text-white focus:border-brass-400 focus:outline-none";

function validate(f: FormData): Record<string, string> {
  const e: Record<string, string> = {};
  const get = (k: string) => String(f.get(k) ?? "").trim();
  if (get("full_name").length < 2) e.full_name = "Enter your full name.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(get("email"))) e.email = "Enter a valid email address.";
  if (get("firm_name").length < 2) e.firm_name = "Enter your firm's name.";
  if (get("message").length > 2000) e.message = "Please keep the message under 2000 characters.";
  return e;
}

export default function DemoPage() {
  useDocumentTitle("Book a Demo");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const busy = useRef(false); // blocks double submits before state re-renders

  async function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (busy.current) return;
    const f = new FormData(ev.currentTarget);
    if (f.get("website")) return; // honeypot: real people never fill this
    const found = validate(f);
    setErrors(found);
    if (Object.keys(found).length) return;

    busy.current = true;
    setStatus("sending");
    const s = (k: string) => String(f.get(k) ?? "").trim() || null;
    const { error } = await supabase.from("demo_requests").insert({
      full_name: String(f.get("full_name")).trim(),
      email: String(f.get("email")).trim(),
      firm_name: String(f.get("firm_name")).trim(),
      phone: s("phone"),
      firm_size: s("firm_size"),
      preferred_date: s("preferred_date"),
      message: s("message"),
    });
    busy.current = false;
    setStatus(error ? "error" : "done"); // success is shown only if the insert succeeded
  }

  return (
    <div className="min-h-screen bg-ink-950 px-4 py-12 text-white">
      <main className="mx-auto max-w-lg">
        <Link to="/" className="text-sm text-white/60 hover:text-white">← Back to home</Link>
        <h1 className="mt-4 font-display text-3xl font-semibold">Book a demo</h1>
        <p className="mt-2 text-white/65">Tell us about your firm and we will get back to you by email.</p>

        {status === "done" ? (
          <p role="status" className="mt-8 rounded-md border border-brass-500/50 p-5">
            Thank you. Your request was received and we will be in touch at the email you gave.
          </p>
        ) : (
          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
            {([
              ["full_name", "Full name", "text", true],
              ["email", "Work email", "email", true],
              ["firm_name", "Law firm name", "text", true],
              ["phone", "Phone (optional)", "tel", false],
              ["preferred_date", "Preferred date (optional)", "date", false],
            ] as const).map(([name, label, type, req]) => (
              <div key={name}>
                <label htmlFor={name} className="text-sm">{label}</label>
                <input id={name} name={name} type={type} required={req} className={field} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-err` : undefined} />
                {errors[name] && <p id={`${name}-err`} className="mt-1 text-sm text-red-400">{errors[name]}</p>}
              </div>
            ))}
            <div>
              <label htmlFor="firm_size" className="text-sm">Firm size (optional)</label>
              <select id="firm_size" name="firm_size" className={field} defaultValue="">
                <option value="">Select…</option>
                {["1", "2-5", "6-20", "21+"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="message" className="text-sm">Message (optional)</label>
              <textarea id="message" name="message" rows={4} maxLength={2000} className={field} />
              {errors.message && <p className="mt-1 text-sm text-red-400">{errors.message}</p>}
            </div>
            <div aria-hidden className="absolute -left-[9999px]">
              <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
            </div>
            {status === "error" && (
              <p role="alert" className="text-sm text-red-400">We couldn't send your request. Please try again in a moment.</p>
            )}
            <button type="submit" disabled={status === "sending"} className="w-full rounded-md bg-brass-500 px-5 py-2.5 text-sm font-medium text-ink-950 hover:bg-brass-400 disabled:opacity-60">
              {status === "sending" ? "Sending…" : "Request a demo"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
