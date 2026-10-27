"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Loader2, MailCheck } from "lucide-react"

import {
  AuthAlert,
  authInputClass,
  authLinkClass,
  authSubmitClass,
} from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authApi } from "@/lib/api"
import { cn } from "@/lib/utils"

// h-space-api ignores a repeat request inside this window (and the code
// expires after 10 minutes), so the resend button waits it out.
const RESEND_COOLDOWN_SECONDS = 60

/**
 * "Continue with email": email → 6-digit code → signed in. The same flow
 * signs up an address that has no account yet (if it's invited, or sign-up
 * is open), so it serves both the login and register pages.
 */
export function EmailCodeSignIn({
  onSignedIn,
  onMfaRequired,
}: {
  onSignedIn: () => void
  /** The account has two-step verification; finish with authApi.verifyMfa. */
  onMfaRequired: (mfaToken: string) => void
}) {
  const [step, setStep] = useState<"email" | "code">("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  async function sendCode() {
    setError("")
    setLoading(true)
    try {
      await authApi.requestEmailCode(email.trim())
      setStep("code")
      setCode("")
      setResendIn(RESEND_COOLDOWN_SECONDS)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn't send the code. Try again.")
    } finally {
      setLoading(false)
    }
  }

  async function verifyCode() {
    setError("")
    setLoading(true)
    try {
      const result = await authApi.verifyEmailCode(email.trim(), code)
      if (result.status === "mfa_required") onMfaRequired(result.mfaToken)
      else onSignedIn()
    } catch (error) {
      setError(error instanceof Error ? error.message : "That code didn't work. Try again.")
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void (step === "email" ? sendCode() : verifyCode())
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {step === "email" ? (
        <FieldGroup>
          <Field>
            <FieldLabel>Email</FieldLabel>
            <FieldContent>
              <Input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className={authInputClass}
              />
            </FieldContent>
            <p className="text-xs leading-relaxed text-muted-foreground">
              We&apos;ll email you a 6-digit code — no password needed. Invited but new here? This
              creates your account.
            </p>
          </Field>
        </FieldGroup>
      ) : (
        <FieldGroup className="gap-4">
          {/* h-space-api answers the same whether or not it sent a code
              (sign-up is invite-only), so this can't promise one. */}
          <AuthAlert tone="info" icon={MailCheck}>
            If <span className="font-semibold text-foreground">{email}</span> has an account or an
            invite, a code is on its way. It expires in 10 minutes.
          </AuthAlert>
          <Field>
            <FieldLabel>Sign-in code</FieldLabel>
            <FieldContent>
              <Input
                name="one-time-code"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                autoFocus
                className={cn(authInputClass, "text-center text-lg tracking-[0.5em]")}
              />
            </FieldContent>
          </Field>
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setStep("email")
                setError("")
              }}
              className={authLinkClass}
            >
              Use a different email
            </button>
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={loading || resendIn > 0}
              className={cn(
                authLinkClass,
                "disabled:cursor-not-allowed disabled:font-medium disabled:text-muted-foreground disabled:no-underline",
              )}
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            </button>
          </div>
        </FieldGroup>
      )}

      {error && <AuthAlert>{error}</AuthAlert>}

      <Button
        type="submit"
        disabled={loading || (step === "code" && code.length !== 6)}
        className={authSubmitClass}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" />
            {step === "email" ? "Sending code…" : "Signing in…"}
          </>
        ) : (
          <>
            {step === "email" ? "Email me a code" : "Continue"}
            <ArrowRight />
          </>
        )}
      </Button>
    </form>
  )
}
