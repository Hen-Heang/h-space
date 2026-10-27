"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/auth-shell";
import { HengoGoogleSignIn } from "@/components/auth/hengo-google-sign-in";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const requestedNext = searchParams.get("next");
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/finance";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { error: authError } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setPending(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.push(next);
    router.refresh();
  }

  function switchMode() {
    setMode((current) => (current === "login" ? "signup" : "login"));
    setError(null);
    setPassword("");
    setShowPassword(false);
  }

  const googleUnavailable = error === "Google sign-in is not configured.";

  return (
    <AuthShell
      title={mode === "login" ? "Welcome back" : "Create your account"}
      description={
        mode === "login"
          ? "Sign in to continue to your Luyra workspace."
          : "Start tracking your cash flow, budgets, savings, and reviews in one place."
      }
    >
      <div className="space-y-5">
        <div className={cn("space-y-5", googleUnavailable && "hidden")}>
          <div className="rounded-2xl border border-border/70 bg-background/55 p-3 shadow-sm">
            <HengoGoogleSignIn
              redirectTo={next}
              onError={setError}
              onPendingChange={setPending}
            />
          </div>

          <div className="flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Or continue with email
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>

        {error && (
          <div
            className={cn(
              "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm",
              googleUnavailable
                ? "border-warning/25 bg-warning/5 text-foreground"
                : "border-destructive/30 bg-destructive/5 text-destructive"
            )}
            role="alert"
          >
            <AlertCircle
              className={cn("mt-0.5 size-4 shrink-0", googleUnavailable && "text-warning")}
              aria-hidden="true"
            />
            <p className="leading-5">
              {googleUnavailable
                ? "Google sign-in is currently unavailable. Email and password still work normally."
                : error}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="h-12 rounded-xl bg-background/70 pl-10"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error && !googleUnavailable) setError(null);
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="password">Password</Label>
              {mode === "login" && (
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <LockKeyhole
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder={mode === "login" ? "Enter your password" : "At least 6 characters"}
                className="h-12 rounded-xl bg-background/70 pl-10 pr-12"
                required
                minLength={6}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error && !googleUnavailable) setError(null);
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="h-12 w-full rounded-xl text-sm font-semibold" disabled={pending}>
            {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="pt-1 text-center text-sm text-muted-foreground">
          {mode === "login" ? "New to Luyra?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={switchMode}
            className="font-semibold text-foreground underline-offset-4 transition-colors hover:text-success hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </AuthShell>
  );
}
