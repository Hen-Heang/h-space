"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react"
import { motion } from "motion/react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authApi } from "@/lib/api"
import { supabase } from "@/lib/supabase"

// Supabase's reset-password email links here with a recovery token in the URL;
// detectSessionInUrl (lib/supabase.ts) exchanges it for a session automatically
// and fires a PASSWORD_RECOVERY auth event once that's done.
export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [invalidLink, setInvalidLink] = useState(false)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true)
    })

    // The event may have already fired before this listener attached — fall
    // back to checking for a live session after giving detectSessionInUrl a
    // moment to finish exchanging the link.
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) setReady(true)
      else setInvalidLink(true)
    }, 1500)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await authApi.updatePassword(password)
      setDone(true)
      setTimeout(() => router.push("/home"), 1500)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn't update your password. Try again.")
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
        {done ? (
          <div className="space-y-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={26} />
            </span>
            <div className="space-y-2">
              <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
                Password updated
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Taking you to H-Space…
              </p>
            </div>
          </div>
        ) : invalidLink ? (
          <div className="space-y-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle size={26} />
            </span>
            <div className="space-y-2">
              <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
                Link expired
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                This reset link is invalid or has expired. Request a new one to continue.
              </p>
            </div>
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              Request a new link <ArrowRight size={15} />
            </Link>
          </div>
        ) : !ready ? (
          <div className="flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
            <Loader2 size={22} className="animate-spin" />
            Verifying your link…
          </div>
        ) : (
          <>
            <div className="mb-8 space-y-2">
              <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
                Set a new password
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Choose a new password for your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <FieldGroup>
                <Field>
                  <FieldLabel className="text-sm font-medium text-foreground/80">
                    New password
                  </FieldLabel>
                  <FieldContent>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        autoFocus
                        className="h-11 rounded-xl border-border bg-accent/5 pl-4 pr-12 transition-all focus:bg-background"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
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
                    Updating…
                  </>
                ) : (
                  <>
                    Update password
                    <ArrowRight size={17} className="ml-1.5" />
                  </>
                )}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </main>
  )
}
