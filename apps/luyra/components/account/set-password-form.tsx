"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 12;

export function SetPasswordForm({ email }: { email: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setPassword("");
      setConfirmation("");
      setSuccess(true);
    } catch {
      setError("Could not update the password. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="size-4" />
          <CardTitle>Set an email password</CardTitle>
        </div>
        <CardDescription className="break-words [overflow-wrap:anywhere]">
          This adds password login to the existing account {email}. Your Google login and existing
          data remain attached to the same user.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
                setSuccess(false);
              }}
              aria-describedby="password-guidance"
              required
            />
            <p id="password-guidance" className="text-xs text-muted-foreground">
              Use at least {MIN_PASSWORD_LENGTH} characters. A password manager-generated password
              is recommended.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              value={confirmation}
              onChange={(event) => {
                setConfirmation(event.target.value);
                setError(null);
                setSuccess(false);
              }}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="flex items-start gap-2 break-words text-sm text-emerald-700 [overflow-wrap:anywhere]" role="status">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              Password set. You can now sign in with {email} and this password.
            </p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Set password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
