"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, ArrowRight, KeyRound, Loader2, MailCheck } from "lucide-react"

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
import { authApi } from "@/lib/api"
import { cn } from "@/lib/utils"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await authApi.requestPasswordReset(email)
      setSent(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn't send the reset email. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      {sent ? (
        <AuthHeading
          icon={MailCheck}
          tone="success"
          title="Check your email"
          description={
            <>
              If an account exists for <span className="font-medium text-foreground">{email}</span>,
              we&apos;ve sent a link to reset your password.
            </>
          }
        />
      ) : (
        <>
          <AuthHeading
            icon={KeyRound}
            title="Reset your password"
            description="Enter your email and we'll send you a link to set a new password."
          />

          <form onSubmit={handleSubmit} className="space-y-5">
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
              </Field>
            </FieldGroup>

            {error && <AuthAlert>{error}</AuthAlert>}

            <Button type="submit" disabled={loading} className={authSubmitClass}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  Send reset link
                  <ArrowRight />
                </>
              )}
            </Button>
          </form>
        </>
      )}

      <p className="mt-8 text-center text-sm">
        <Link href="/login" className={cn(authLinkClass, "inline-flex items-center gap-1.5")}>
          <ArrowLeft size={15} /> Back to sign in
        </Link>
      </p>
    </AuthShell>
  )
}
