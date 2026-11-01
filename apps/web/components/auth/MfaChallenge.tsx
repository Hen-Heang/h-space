"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, ShieldCheck } from "lucide-react"
import { motion } from "motion/react"

import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authApi } from "@/lib/api"

// Second sign-in step for accounts with MFA on. The password (or Google) step
// returned an mfaToken; exchanging it with a TOTP or backup code yields the
// real token pair.
export function MfaChallenge({
  mfaToken,
  onCancel,
  redirectTo = "/home",
}: {
  mfaToken: string
  onCancel: () => void
  redirectTo?: string
}) {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await authApi.verifyMfa(mfaToken, code.replace(/\s+/g, ""))
      router.push(redirectTo)
    } catch (error) {
      setError(error instanceof Error ? error.message : "That code didn't work. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8 space-y-2">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <ShieldCheck size={22} />
        </span>
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
          Two-step verification
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Enter the 6-digit code from your authenticator app, or one of your backup codes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <FieldGroup>
          <Field>
            <FieldLabel className="text-sm font-medium text-foreground/80">
              Verification code
            </FieldLabel>
            <FieldContent>
              <Input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                autoFocus
                className="h-11 rounded-xl border-border bg-accent/5 px-4 tracking-widest transition-all focus:bg-background"
              />
            </FieldContent>
          </Field>
        </FieldGroup>

        {error && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-sm font-medium text-destructive"
          >
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <p className="leading-relaxed">{error}</p>
          </motion.div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 active:scale-[0.99]"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="mr-2 animate-spin" />
              Verifying…
            </>
          ) : (
            <>
              Verify
              <ArrowRight size={17} className="ml-1.5" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400"
        >
          <ArrowLeft size={15} /> Back to sign in
        </button>
      </p>
    </div>
  )
}
