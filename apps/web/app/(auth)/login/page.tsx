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
import { MfaDevicePicker, useMfaDevices } from "@/components/auth/mfa-device-picker"
import { EmailCodeSignIn } from "@/components/email-code-sign-in"
import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { DEFAULT_AFTER_SIGN_IN, safeNextPath } from "@/lib/safe-next-path"
import { cn } from "@/lib/utils"

type SignInMethod = "password" | "email-code"

const SIGN_IN_METHODS: Array<{ id: SignInMethod; label: string }> = [
  { id: "password", label: "Password" },
  { id: "email-code", label: "Email code" },
]

export default function LoginPage() {
  const router = useRouter()
  const [method, setMethod] = useState<SignInMethod>("password")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  // Set once the first factor is accepted for an account with two-step
  // verification; the form then asks for the authenticator code instead.
  const [factorId, setFactorId] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState("")
  // With a backup authenticator linked, the user picks which device the code is from.
  const mfaDevices = useMfaDevices(factorId !== null)
  // Where to go once signed in: the page the auth gate sent us from
  // (?next=, validated as a same-site path), else Home.
  const [afterSignIn, setAfterSignIn] = useState(DEFAULT_AFTER_SIGN_IN)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    // /register links here with ?method=email-code for password-free sign-up.
    if (params.get("method") === "email-code") setMethod("email-code")
    const next = safeNextPath(params.get("next"))
    if (next) setAfterSignIn(next)
    // A sign-in left half-finished in this browser (code never entered):
    // pick it up at the code step rather than asking for the password again.
    let active = true
    authApi
      .pendingMfa()
      .then((pending) => {
        if (active && pending) setFactorId(pending)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const result = factorId
        ? await authApi.verifyMfa(factorId, mfaCode.trim())
        : await authApi.login({ email: email.trim(), password })
      if (result.status === "mfa_required") {
        setFactorId(result.factorId)
        setPassword("")
        return
      }
      router.push(afterSignIn)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign-in failed. Try again.")
    } finally {
      setLoading(false)
    }
  }

  // The first factor already created a (half-signed-in) session; end it so
  // the next person starts clean.
  async function cancelMfa() {
    await authApi.logout()
    setFactorId(null)
    setMfaCode("")
    setError("")
  }

  return (
    <AuthShell
      footer={!factorId && <AuthLegal action="signing in" />}
      topAction={
        !factorId && (
          <>
            New to H-Space?{" "}
            <Link href="/register" className={authLinkClass}>
              Get access
            </Link>
          </>
        )
      }
    >
      {factorId ? (
        <AuthHeading
          icon={ShieldCheck}
          title="Two-step verification"
          description="Enter the 6-digit code from your authenticator app."
        />
      ) : (
        <AuthHeading title="Welcome back" description="Sign in to your H-Space." />
      )}

      {!factorId && (
        <>
          <GoogleSignInButton
            onError={setError}
            onMfaRequired={(id) => {
              setError("")
              setFactorId(id)
            }}
            redirectTo={afterSignIn}
          />
          <AuthDivider label="or sign in with" />
        </>
      )}

      {!factorId && (
        <div
          role="tablist"
          aria-label="Sign-in method"
          className="mb-6 grid grid-cols-2 gap-1 rounded-[14px] bg-muted p-1"
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
                "h-10 rounded-[11px] text-sm font-medium outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring",
                method === option.id
                  ? "bg-card font-semibold text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {!factorId && method === "email-code" ? (
        <EmailCodeSignIn
          onSignedIn={() => router.push(afterSignIn)}
          onMfaRequired={(id) => {
            setError("")
            setFactorId(id)
          }}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {factorId ? (
            <FieldGroup className="gap-4">
              <MfaDevicePicker
                devices={mfaDevices}
                value={factorId}
                onChange={(id) => {
                  setFactorId(id)
                  setError("")
                }}
              />
              <Field>
                <FieldLabel>Verification code</FieldLabel>
                <FieldContent>
                  <Input
                    name="one-time-code"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    placeholder="123456"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    required
                    autoFocus
                    className={cn(authInputClass, "text-center text-lg tracking-[0.4em]")}
                  />
                </FieldContent>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {mfaDevices.length > 1
                    ? "Lost a device? Use a code from another one you've linked."
                    : "Lost your phone? Ask the H-Space owner to reset two-step verification."}
                </p>
              </Field>
            </FieldGroup>
          ) : (
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>Email</FieldLabel>
                <FieldContent>
                  <Input
                    type="email"
                    name="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
          <Button type="submit" disabled={loading} className={authSubmitClass}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                {factorId ? "Verifying…" : "Signing in…"}
              </>
            ) : (
              <>
                {factorId ? "Verify" : "Sign in"}
                <ArrowRight />
              </>
            )}
          </Button>

          {factorId && (
            <button
              type="button"
              onClick={() => void cancelMfa()}
              className={cn(authLinkClass, "block w-full text-center text-sm")}
            >
              Use a different account
            </button>
          )}
        </form>
      )}

      {!factorId && (
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck
            size={15}
            aria-hidden="true"
            className="text-emerald-600 dark:text-emerald-400"
          />
          Protected with optional two-step verification
        </p>
      )}
    </AuthShell>
  )
}
