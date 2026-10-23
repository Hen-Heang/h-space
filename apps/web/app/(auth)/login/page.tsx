"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  MessagesSquare,
  BookOpen,
  Mic,
} from "lucide-react"
import { motion } from "motion/react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authApi } from "@/lib/api"
import { GoogleSignInButton } from "@/components/google-sign-in-button"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await authApi.login({ email, password })
      router.push("/home")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Invalid email or password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-muted/30 px-4 py-6 selection:bg-blue-500/30 sm:px-6">
      {/* Brand panel — desktop only */}
      <BrandPanel />

      {/* Form panel */}
      <div className="relative flex w-full max-w-[480px] flex-col rounded-3xl border border-border/70 bg-card px-5 py-6 shadow-xl shadow-slate-950/[0.04] sm:px-9 sm:py-8">
        <div className="flex items-center justify-between lg:hidden">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl shadow-sm">
              <Image
                src="/H%20Space%20Icon.png"
                alt=""
                width={36}
                height={36}
                className="h-full w-full"
              />
            </span>
            <span className="text-lg font-semibold tracking-tight text-foreground">H-Space</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="hidden justify-end lg:flex">
          <ThemeToggle />
        </div>

        <div className="flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="w-full py-5"
          >
            <div className="mb-8 space-y-2">
              <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
                Welcome back
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Sign in to continue your journey to Korean fluency.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <FieldGroup className="space-y-4">
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
                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel className="text-sm font-medium text-foreground/80">
                      Password
                    </FieldLabel>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FieldContent>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-11 rounded-xl border-border bg-accent/5 pl-4 pr-12 transition-all focus:bg-background"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
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
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={17} className="ml-1.5" />
                  </>
                )}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-muted-foreground">or continue with</span>
              </div>
            </div>

            <GoogleSignInButton onError={setError} redirectTo="/home" />

            <p className="mt-8 text-center text-sm text-muted-foreground">
              New to H-Space?{" "}
              <Link
                href="/register"
                className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                Create an account
              </Link>
            </p>
          </motion.div>
        </div>

        <p className="text-center text-xs leading-relaxed text-muted-foreground/80">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  )
}

const FEATURES = [
  {
    icon: MessagesSquare,
    title: "AI conversation partner",
    desc: "Practice standups and meetings in real workplace Korean.",
    color: "text-sky-300",
  },
  {
    icon: BookOpen,
    title: "Developer vocabulary",
    desc: "Spaced-repetition decks tuned to technical, on-the-job terms.",
    color: "text-amber-300",
  },
  {
    icon: Mic,
    title: "Mock interviews",
    desc: "Rehearse Korean tech interviews with instant feedback.",
    color: "text-violet-300",
  },
]

function BrandPanel() {
  return (
    <aside className="hidden">
      {/* gradient + glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950" />
        <div className="absolute -left-20 top-1/3 h-[420px] w-[420px] rounded-full bg-sky-400/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-violet-500/20 blur-[120px]" />
      </div>

      {/* huge decorative hangul */}
      <span className="pointer-events-none absolute -bottom-10 -right-4 select-none text-[14rem] font-black leading-none text-white/[0.06]">
        한국어
      </span>

      <div className="relative z-10 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
          <Image src="/H%20Space%20Icon.png" alt="" width={40} height={40} className="h-full w-full" />
        </span>
        <span className="text-xl font-semibold tracking-tight">H-Space</span>
      </div>

      <div className="relative z-10 max-w-md space-y-8">
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold leading-snug tracking-tight">
            Master workplace Korean, built for engineers.
          </h2>
          <p className="text-sm leading-relaxed text-white/70">
            Your personal AI tutor for thriving in Korean tech companies — from daily standups to
            code reviews.
          </p>
        </div>

        <ul className="space-y-5">
          {FEATURES.map((f) => (
            <li key={f.title} className="flex gap-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                <f.icon size={17} className={f.color} />
              </span>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-white">{f.title}</p>
                <p className="text-xs leading-relaxed text-white/60">{f.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 text-xs text-white/50">
        Trusted by foreign developers working across Korea&apos;s tech industry.
      </p>
    </aside>
  )
}
