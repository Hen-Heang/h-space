"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSent(false);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        "/reset-password"
      )}`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSent(true);
    } catch {
      setError("Could not send the recovery email. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="recovery-email">Email address</Label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="recovery-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-11 pl-9"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
              setSent(false);
            }}
            required
          />
        </div>
      </div>

      {error && (
        <div
          className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="leading-5">{error}</p>
        </div>
      )}

      {sent && (
        <div
          className="flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/5 px-3.5 py-3 text-sm text-success"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="leading-5">
            If an account exists for this email, a password recovery link has been sent.
          </p>
        </div>
      )}

      <Button type="submit" className="h-11 w-full font-semibold" disabled={pending || sent}>
        <Mail className="size-4" aria-hidden="true" />
        {pending ? "Sending…" : sent ? "Email sent" : "Send recovery link"}
      </Button>
    </form>
  );
}
