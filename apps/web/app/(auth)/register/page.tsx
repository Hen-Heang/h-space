"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowRight, Check, Loader2, Mail, MailCheck } from "lucide-react"

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
import { Field, FieldContent, FieldLabel, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authApi } from "@/lib/api"
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_HINT,
  passwordPolicyError,
} from "@/lib/password-policy"
import { USERNAME_HINT, usernameFormatError } from "@/lib/username"
import { cn } from "@/lib/utils"

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "unknown"

export default function RegisterPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  // Set after a successful sign-up: h-space-api emails a verification link
  // and refuses password login until it's opened.
  const [createdFor, setCreatedFor] = useState<string | null>(null)
  // Sign-up is invite-only; the invite email links here as ?email=<invitee>.
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null)

  useEffect(() => {
    const invited = new URLSearchParams(window.location.search).get("email")
    if (invited) {
      setInvitedEmail(invited)
      setEmail(invited)
    }
  }, [])

  // Check availability once typing pauses. A failed check ("unknown") doesn't
  // block submit — the server still rejects a taken name.
  useEffect(() => {
    const value = username.trim()
    if (!value) {
      setUsernameStatus("idle")
      return
    }
    if (usernameFormatError(value)) {
      setUsernameStatus("invalid")
      return
    }
    setUsernameStatus("checking")
    let active = true
    const timer = setTimeout(() => {
      authApi
        .isUsernameAvailable(value)
        .then((available) => active && setUsernameStatus(available ? "available" : "taken"))
        .catch(() => active && setUsernameStatus("unknown"))
    }, 400)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [username])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formError =
      usernameFormatError(username) ??
      (usernameStatus === "taken" ? "That username is taken. Try another." : null) ??
      passwordPolicyError(password)
    if (formError) {
      setError(formError)
      return
    }
    setError("")
    setLoading(true)
    try {
      const data = await authApi.register({
        email,
        password,
        displayName,
        username: username.trim(),
      })
      if (data.needsEmailConfirmation) {
        setCreatedFor(data.email)
        return
      }
      router.push("/home")
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Registration failed. Email may already be in use.",
      )
    } finally {
      setLoading(false)
    }
  }

  if (createdFor) {
    return (
      <AuthShell brand="signup">
        <AuthHeading
          icon={MailCheck}
          tone="success"
          title="Check your inbox"
          description={
            <>
              We sent a verification link to{" "}
              <span className="font-semibold text-foreground">{createdFor}</span>. Open it, then
              sign in with your email or username and password.
            </>
          }
        />
        <Button asChild className={authSubmitClass}>
          <Link href="/login">
            Go to sign in
            <ArrowRight />
          </Link>
        </Button>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No email?{" "}
          <Link href="/login?method=email-code" className={authLinkClass}>
            Sign in with an email code
          </Link>{" "}
          — it verifies your address too.
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      brand="signup"
      footer={<AuthLegal action="creating an account" />}
      topAction={
        <>
          Already have an account?{" "}
          <Link href="/login" className={authLinkClass}>
            Sign in
          </Link>
        </>
      }
    >
      <AuthHeading
        title="Create your account"
        description="Set up your H-Space in less than a minute."
      />

      {invitedEmail && (
        <div className="mb-6">
          <AuthAlert tone="info" icon={Mail}>
            You&apos;re invited. Sign up with{" "}
            <span className="font-semibold text-foreground">{invitedEmail}</span> — the invite only
            works for that address.
          </AuthAlert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <FieldGroup className="gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Full name</FieldLabel>
              <FieldContent>
                <Input
                  name="displayName"
                  autoComplete="name"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoFocus
                  className={authInputClass}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Username</FieldLabel>
              <FieldContent>
                <Input
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="e.g. jane.doe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  maxLength={30}
                  aria-invalid={usernameStatus === "invalid" || usernameStatus === "taken"}
                  aria-describedby="username-hint"
                  className={authInputClass}
                />
              </FieldContent>
            </Field>
          </div>
          <UsernameHint status={usernameStatus} username={username} />

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
                className={authInputClass}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Password</FieldLabel>
            <FieldContent>
              <PasswordInput
                name="password"
                autoComplete="new-password"
                placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={PASSWORD_MIN_LENGTH}
              />
            </FieldContent>
            <p className="text-xs leading-relaxed text-muted-foreground">{PASSWORD_POLICY_HINT}</p>
          </Field>
        </FieldGroup>

        {error && <AuthAlert>{error}</AuthAlert>}

        <Button type="submit" disabled={loading} className={authSubmitClass}>
          {loading ? (
            <>
              <Loader2 className="animate-spin" />
              Creating account…
            </>
          ) : (
            <>
              Create account
              <ArrowRight />
            </>
          )}
        </Button>
      </form>

      <AuthDivider />

      <Button
        asChild
        variant="secondary"
        className={cn(
          authSubmitClass,
          "bg-primary/10 font-semibold text-primary shadow-none hover:bg-primary/15",
        )}
      >
        <Link href="/login?method=email-code">
          <Mail />
          Prefer no password? Sign up with an email code
        </Link>
      </Button>
    </AuthShell>
  )
}

function UsernameHint({ status, username }: { status: UsernameStatus; username: string }) {
  const base = "-mt-1 flex items-center gap-1.5 text-xs leading-relaxed"
  switch (status) {
    case "checking":
      return (
        <p id="username-hint" className={cn(base, "text-muted-foreground")}>
          <Loader2 size={13} className="animate-spin" /> Checking availability…
        </p>
      )
    case "available":
      return (
        <p id="username-hint" className={cn(base, "text-emerald-600 dark:text-emerald-400")}>
          <Check size={13} /> {username.trim().toLowerCase()} is available. You can sign in with it
          or your email.
        </p>
      )
    case "taken":
      return (
        <p id="username-hint" className={cn(base, "text-destructive")}>
          That username is taken.
        </p>
      )
    case "invalid":
      return (
        <p id="username-hint" className={cn(base, "text-destructive")}>
          {usernameFormatError(username)}
        </p>
      )
    default:
      return (
        <p id="username-hint" className={cn(base, "text-muted-foreground")}>
          {USERNAME_HINT}
        </p>
      )
  }
}
