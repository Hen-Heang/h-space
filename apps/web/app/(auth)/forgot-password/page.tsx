"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react"
import { motion } from "motion/react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authApi } from "@/lib/api"

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
    <main className="flex min-h-dvh w-full items-center justify-center bg-background px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] selection:bg-blue-500/30">
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-8 sm:px-8 lg:px-12">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl shadow-sm">
            <Image src="/H%20Space%20Icon.png" alt="" width={36} height={36} className="h-full w-full" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">H-Space</span>
        </Link>
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-[400px]"
      >
        {sent ? (
          <div className="space-y-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={26} />
            </span>
            <div className="space-y-2">
              <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
                Check your email
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                If an account exists for{" "}
                <span className="font-medium text-foreground">{email}</span>, we&apos;ve sent a link
                to reset your password.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              <ArrowLeft size={15} /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8 space-y-2">
              <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
                Reset your password
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Enter your email and we&apos;ll send you a link to set a new password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <FieldGroup>
                <Field>
                  <FieldLabel className="text-sm font-medium text-foreground/80">Email</FieldLabel>
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
                      className="h-11 rounded-xl border-border bg-accent/5 px-4 transition-all focus:bg-background"
                    />
                  </FieldContent>
                </Field>
              </FieldGroup>

              {error && (
                <motion.div
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
                    Sending…
                  </>
                ) : (
                  <>
                    Send reset link
                    <ArrowRight size={17} className="ml-1.5" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                <ArrowLeft size={15} /> Back to sign in
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </main>
  )
}
