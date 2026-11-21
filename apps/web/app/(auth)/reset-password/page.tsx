"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowRight, CheckCircle2, KeyRound, Link2Off, Loader2, ShieldCheck } from "lucide-react"

import {
  AuthAlert,
  AuthHeading,
  AuthShell,
  PasswordInput,
  authInputClass,
  authLinkClass,
  authSubmitClass,
} from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authApi } from "@/lib/api"
import { PASSWORD_POLICY_HINT, passwordPolicyError } from "@/lib/password-policy"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

// Supabase's reset email links here; supabase-js (detectSessionInUrl) turns
// the link into a short recovery session before this page asks for anything.
// No session means the link was invalid, expired or already used. An account
// with an authenticator must enter its code first: Supabase refuses a
// password change from an aal1 session. Afterwards the session is ended and
// the user signs in with the new password.
export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [invalidLink, setInvalidLink] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let active = true
    // Supabase reports a bad link in the URL fragment instead of a session.
    const linkError = new URLSearchParams(window.location.hash.slice(1)).get("error")
    if (linkError) {
      setInvalidLink(true)
      return
    }
    // getSession() waits for supabase-js to finish reading the link.
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return
        if (!data.session) {
          setInvalidLink(true)
          return
        }
        const pending = await authApi.pendingMfa()
        if (!active) return
        setFactorId(pending)
        setReady(true)
      })
      .catch(() => {
        if (active) setInvalidLink(true)
      })
    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    if (factorId) {
      setLoading(true)
      try {
        await authApi.verifyMfa(factorId, mfaCode)
        setFactorId(null)
        setMfaCode("")
      } catch (error) {
        setError(error instanceof Error ? error.message : "That code didn't work. Try again.")
      } finally {
        setLoading(false)
      }
      return
    }
    const policyError = passwordPolicyError(password)
    if (policyError) {
      setError(policyError)
      return
    }
    setLoading(true)
    try {
      await authApi.updatePassword(password)
      await authApi.logout()
      setDone(true)
      setTimeout(() => router.push("/login"), 1500)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn't update your password. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      {done ? (
        <AuthHeading
          icon={CheckCircle2}
          tone="success"
          title="Password updated"
          description="Taking you to sign in…"
        />
      ) : invalidLink ? (
        <>
          <AuthHeading
            icon={Link2Off}
            tone="error"
            title="Link expired"
            description="This reset link is invalid, has expired or was already used. Request a new one to continue."
          />
          <Link
            href="/forgot-password"
            className={cn(authLinkClass, "inline-flex items-center gap-1.5 text-sm")}
          >
            Request a new link <ArrowRight size={15} />
          </Link>
        </>
      ) : !ready ? (
        <div
          role="status"
          className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground"
        >
          <Loader2 size={22} className="animate-spin" />
          Verifying your link…
        </div>
      ) : (
        <>
          <AuthHeading
            icon={factorId ? ShieldCheck : KeyRound}
            title={factorId ? "Two-step verification" : "Set a new password"}
            description={
              factorId
                ? "Enter the 6-digit code from your authenticator app to continue."
                : "Choose a new password for your account."
            }
          />

          <form onSubmit={handleSubmit} className="space-y-5">
            <FieldGroup>
              {factorId ? (
                <Field>
                  <FieldLabel>Verification code</FieldLabel>
                  <FieldContent>
                    <Input
                      name="one-time-code"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      placeholder="123456"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                      autoFocus
                      className={cn(authInputClass, "text-center text-lg tracking-[0.4em]")}
                    />
                  </FieldContent>
                </Field>
              ) : (
                <Field>
                  <FieldLabel>New password</FieldLabel>
                  <FieldContent>
                    <PasswordInput
                      name="password"
                      autoComplete="new-password"
                      placeholder="Your new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus
                    />
                  </FieldContent>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {PASSWORD_POLICY_HINT}
                  </p>
                </Field>
              )}
            </FieldGroup>

            {error && <AuthAlert>{error}</AuthAlert>}

            <Button type="submit" disabled={loading} className={authSubmitClass}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  {factorId ? "Verifying…" : "Updating…"}
                </>
              ) : (
                <>
                  {factorId ? "Verify" : "Update password"}
                  <ArrowRight />
                </>
              )}
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  )
}
