"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowRight, CheckCircle2, KeyRound, Link2Off, Loader2 } from "lucide-react"

import {
  AuthAlert,
  AuthHeading,
  AuthShell,
  PasswordInput,
  authLinkClass,
  authSubmitClass,
} from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field"
import { authApi } from "@/lib/api"
import { PASSWORD_POLICY_HINT, passwordPolicyError } from "@/lib/password-policy"
import { cn } from "@/lib/utils"

// h-space-api's reset email links here as /reset-password?token=…. The token
// is checked up front so an expired link says so before the user types a new
// password, then sent along with the new password. Resetting doesn't sign the
// user in — they go to /login with the new password.
export default function ResetPasswordPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [invalidLink, setInvalidLink] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let active = true
    const linkToken = new URLSearchParams(window.location.search).get("token")
    if (!linkToken) {
      setInvalidLink(true)
      return
    }
    authApi
      .validateResetToken(linkToken)
      .then((valid) => {
        if (!active) return
        if (valid) {
          setToken(linkToken)
          setReady(true)
        } else {
          setInvalidLink(true)
        }
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
    const policyError = passwordPolicyError(password)
    if (policyError) {
      setError(policyError)
      return
    }
    if (!token) return
    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
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
            description="This reset link is invalid or has expired. Request a new one to continue."
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
            icon={KeyRound}
            title="Set a new password"
            description="Choose a new password for your account."
          />

          <form onSubmit={handleSubmit} className="space-y-5">
            <FieldGroup>
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
            </FieldGroup>

            {error && <AuthAlert>{error}</AuthAlert>}

            <Button type="submit" disabled={loading} className={authSubmitClass}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Updating…
                </>
              ) : (
                <>
                  Update password
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
