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

// Supabase refuses a repeat request inside this window, so the resend button
// waits it out.
const RESEND_COOLDOWN_SECONDS = 60
// Supabase's email OTP length is a project setting (6 by default).
const MIN_CODE_LENGTH = 6
const MAX_CODE_LENGTH = 10

/**
 * "Email code": email → code from the email → signed in. Only for existing
 * accounts — H-Space has no self sign-up (lib/api/auth.ts).
 */
export function EmailCodeSignIn({
  onSignedIn,
  onMfaRequired,
}: {
  onSignedIn: () => void
  /** The account has two-step verification; finish with authApi.verifyMfa(factorId, code). */
  onMfaRequired: (factorId: string) => void
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
      if (result.status === "mfa_required") onMfaRequired(result.factorId)
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
              We&apos;ll email you a sign-in code — no password needed.
            </p>
          </Field>
        </FieldGroup>
      ) : (
        <FieldGroup className="gap-4">
          {/* The form answers the same whether or not the address has an
              account (lib/api/auth.ts), so this can't promise a code. */}
          <AuthAlert tone="info" icon={MailCheck}>
            If <span className="font-semibold text-foreground">{email}</span> has an H-Space
            account, a code is on its way. It expires after a few minutes.
          </AuthAlert>
          <Field>
            <FieldLabel>Sign-in code</FieldLabel>
            <FieldContent>
              <Input
                name="one-time-code"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern={`\\d{${MIN_CODE_LENGTH},${MAX_CODE_LENGTH}}`}
                maxLength={MAX_CODE_LENGTH}
                placeholder="123456"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, MAX_CODE_LENGTH))
                }
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
        disabled={loading || (step === "code" && code.length < MIN_CODE_LENGTH)}
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
