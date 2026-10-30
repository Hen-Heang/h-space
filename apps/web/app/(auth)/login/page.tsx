"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react"

import {
  AuthAlert,
  AuthDivider,
  AuthHeading,
  AuthLegal,
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
import { AuthApiError } from "@/lib/api/auth-http"
import { EmailCodeSignIn } from "@/components/email-code-sign-in"
import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { cn } from "@/lib/utils"

type SignInMethod = "password" | "email-code"

// h-space-api ExitCode.ACCOUNT_DISABLED: right password, unverified email.
const ACCOUNT_DISABLED = 1003

const SIGN_IN_METHODS: Array<{ id: SignInMethod; label: string }> = [
  { id: "password", label: "Password" },
  { id: "email-code", label: "Email code" },
]

export default function LoginPage() {
  const router = useRouter()
  const [method, setMethod] = useState<SignInMethod>("password")
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  // The password was right but the email was never verified: offer the
  // email-code option, since a correct code verifies the address too.
  const [needsVerification, setNeedsVerification] = useState(false)
  const [loading, setLoading] = useState(false)
  // Set once the password is accepted for an account with two-step
  // verification; the form then asks for the authenticator code instead.
  const [mfaToken, setMfaToken] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState("")

  // /register links here with ?method=email-code for password-free sign-up.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("method") === "email-code") {
      setMethod("email-code")
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setNeedsVerification(false)
    setLoading(true)
    try {
      const result = mfaToken
        ? await authApi.verifyMfa(mfaToken, mfaCode.trim())
        : await authApi.login({ identifier: identifier.trim(), password })
      if (result.status === "mfa_required") {
        setMfaToken(result.mfaToken)
        setPassword("")
        return
      }
      router.push("/home")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Invalid email, username or password.")
      setNeedsVerification(error instanceof AuthApiError && error.code === ACCOUNT_DISABLED)
    } finally {
      setLoading(false)
    }
  }

  function cancelMfa() {
    setMfaToken(null)
    setMfaCode("")
    setError("")
  }

  return (
    <AuthShell footer={!mfaToken && <AuthLegal action="signing in" />}>
      {mfaToken ? (
        <AuthHeading
          icon={ShieldCheck}
          title="Two-step verification"
          description="Enter the 6-digit code from your authenticator app, or one of your backup codes."
        />
      ) : (
        <AuthHeading title="Welcome back" description="Sign in to your H-Space." />
      )}

      {!mfaToken && (
        <div
          role="tablist"
          aria-label="Sign-in method"
          className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
        >
          {SIGN_IN_METHODS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={method === option.id}
              onClick={() => {
                setMethod(option.id)
                setError("")
              }}
              className={cn(
                "h-9 rounded-lg text-sm font-medium outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring",
                method === option.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {!mfaToken && method === "email-code" ? (
        <EmailCodeSignIn
          onSignedIn={() => router.push("/home")}
          onMfaRequired={(token) => {
            setError("")
            setMfaToken(token)
          }}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {mfaToken ? (
            <FieldGroup>
              <Field>
                <FieldLabel>Verification code</FieldLabel>
                <FieldContent>
                  <Input
                    name="one-time-code"
                    autoComplete="one-time-code"
                    inputMode="text"
                    placeholder="123456"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    required
                    autoFocus
                    className={cn(authInputClass, "text-center text-lg tracking-[0.4em]")}
                  />
                </FieldContent>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  The code expires 5 minutes after your password was accepted.
                </p>
              </Field>
            </FieldGroup>
          ) : (
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>Email or username</FieldLabel>
                <FieldContent>
                  <Input
                    type="text"
                    name="username"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="name@example.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    autoFocus
                    className={authInputClass}
                  />
                </FieldContent>
              </Field>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel>Password</FieldLabel>
                  <Link href="/forgot-password" className={cn(authLinkClass, "text-xs")}>
                    Forgot password?
                  </Link>
                </div>
                <FieldContent>
                  <PasswordInput
                    name="password"
                    autoComplete="current-password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </FieldContent>
              </Field>
            </FieldGroup>
          )}

          {error && <AuthAlert>{error}</AuthAlert>}
          {needsVerification && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Can&apos;t find the verification email?{" "}
              <button
                type="button"
                onClick={() => {
                  setMethod("email-code")
                  setError("")
                  setNeedsVerification(false)
                }}
                className={authLinkClass}
              >
                Sign in with an email code
              </button>{" "}
              — it verifies your address too.
            </p>
          )}

          <Button type="submit" disabled={loading} className={authSubmitClass}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                {mfaToken ? "Verifying…" : "Signing in…"}
              </>
            ) : (
              <>
                {mfaToken ? "Verify" : "Sign in"}
                <ArrowRight />
              </>
            )}
          </Button>

          {mfaToken && (
            <button
              type="button"
              onClick={cancelMfa}
              className={cn(authLinkClass, "block w-full text-center text-sm")}
            >
              Use a different account
            </button>
          )}
        </form>
      )}

      {!mfaToken && (
        <>
          <AuthDivider label="or continue with" />

          <GoogleSignInButton
            onError={setError}
            onMfaRequired={(token) => {
              setError("")
              setMfaToken(token)
            }}
            redirectTo="/home"
          />

          <p className="mt-8 text-center text-sm text-muted-foreground">
            New to H-Space?{" "}
            <Link href="/register" className={authLinkClass}>
              Create an account
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  )
}
