"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowRight, CheckCircle2, Link2Off, Loader2, type LucideIcon } from "lucide-react"

import {
  AuthAlert,
  AuthHeading,
  AuthShell,
  authInputClass,
  authLinkClass,
  authSubmitClass,
} from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { AuthApiError } from "@/lib/api/auth-http"
import { cn } from "@/lib/utils"

type Status = "working" | "done" | "failed"

/**
 * Landing page for an emailed one-time link (/verify-email?token=…,
 * /unlock-account?token=…): runs `action` once with the token, then shows
 * the outcome. When the link is bad or expired it offers to email a new one.
 */
export function TokenLinkAction({
  action,
  workingLabel,
  done,
  failedTitle,
  failedDescription,
  /** h-space-api codes that mean "already done" (e.g. already verified) — shown as success. */
  alreadyDoneCodes = [],
  resend,
}: {
  action: (token: string) => Promise<void>
  workingLabel: string
  done: { title: string; description: string; icon?: LucideIcon }
  failedTitle: string
  failedDescription: string
  alreadyDoneCodes?: number[]
  resend: { label: string; send: (email: string) => Promise<void>; sentMessage: string }
}) {
  const [status, setStatus] = useState<Status>("working")
  // Tokens are single-use: a second call (React's dev-mode double effect)
  // would fail and overwrite the real result, so run the action only once.
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const token = new URLSearchParams(window.location.search).get("token")
    // A link without a token fails the same way an expired one does.
    const run = token ? action(token) : Promise.reject(new Error("Missing token"))
    run
      .then(() => setStatus("done"))
      .catch((error: unknown) => {
        const alreadyDone =
          error instanceof AuthApiError &&
          error.code !== undefined &&
          alreadyDoneCodes.includes(error.code)
        setStatus(alreadyDone ? "done" : "failed")
      })
  }, [action, alreadyDoneCodes])

  return (
    <AuthShell>
      {status === "working" ? (
        <div
          role="status"
          className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground"
        >
          <Loader2 size={22} className="animate-spin" />
          {workingLabel}
        </div>
      ) : status === "done" ? (
        <>
          <AuthHeading
            icon={done.icon ?? CheckCircle2}
            tone="success"
            title={done.title}
            description={done.description}
          />
          <Button asChild className={authSubmitClass}>
            <Link href="/login">
              Continue to sign in
              <ArrowRight />
            </Link>
          </Button>
        </>
      ) : (
        <>
          <AuthHeading
            icon={Link2Off}
            tone="error"
            title={failedTitle}
            description={failedDescription}
          />
          <ResendForm {...resend} />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/login" className={cn(authLinkClass, "inline-flex items-center gap-1")}>
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  )
}

function ResendForm({
  label,
  send,
  sentMessage,
}: {
  label: string
  send: (email: string) => Promise<void>
  sentMessage: string
}) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await send(email.trim())
      setSent(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn't send the email. Try again.")
    } finally {
      setLoading(false)
    }
  }

  if (sent) return <AuthAlert tone="success">{sentMessage}</AuthAlert>

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
              className={authInputClass}
            />
          </FieldContent>
        </Field>
      </FieldGroup>
      {error && <AuthAlert>{error}</AuthAlert>}
      <Button type="submit" disabled={loading} className={authSubmitClass}>
        {loading ? <Loader2 className="animate-spin" /> : null}
        {label}
      </Button>
    </form>
  )
}
