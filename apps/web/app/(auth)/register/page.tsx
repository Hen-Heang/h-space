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
  Sparkles,
  MessagesSquare,
  BookOpen,
  Mic,
} from "lucide-react"
import { motion } from "motion/react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldLabel, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authApi } from "@/lib/api"

const KOREAN_LEVELS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
]

const OCCUPATIONS = [
  { value: "Frontend Developer", label: "Frontend Developer" },
  { value: "Backend Developer", label: "Backend Developer" },
  { value: "Full-Stack Developer", label: "Full-Stack Developer" },
  { value: "QA Engineer", label: "QA Engineer" },
  { value: "DevOps Engineer", label: "DevOps Engineer" },
  { value: "Product Manager", label: "Product Manager" },
  { value: "Data Scientist", label: "Data Scientist" },
  { value: "Other", label: "Other" },
]

const LEARNING_GOALS = [
  { value: "Daily standup participation", label: "Daily standup participation" },
  { value: "Team meeting communication", label: "Team meeting communication" },
  { value: "Writing professional messages", label: "Writing professional messages" },
  { value: "Technical discussion in Korean", label: "Technical discussion in Korean" },
  { value: "General workplace communication", label: "General workplace communication" },
]

const NATIVE_LANGUAGES = [
  "Khmer",
  "English",
  "Chinese",
  "Japanese",
  "Vietnamese",
  "Thai",
  "Indonesian",
  "Filipino",
  "Malay",
  "Other",
]

const selectClass =
  "h-11 w-full rounded-xl border border-border bg-accent/5 px-3 text-base text-foreground outline-none transition-all focus:bg-background focus:ring-2 focus:ring-blue-500/20 dark:bg-white/5 sm:text-sm"
const inputClass =
  "h-11 rounded-xl border-border bg-accent/5 px-4 transition-all focus:bg-background"

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [koreanLevel, setKoreanLevel] = useState("BEGINNER")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [country, setCountry] = useState("")
  const [nativeLanguage, setNativeLanguage] = useState("")
  const [occupation, setOccupation] = useState("")
  const [yearsOfExperience, setYearsOfExperience] = useState("")
  const [learningGoal, setLearningGoal] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (step === 1) {
      setStep(2)
      return
    }
    setError("")
    setLoading(true)
    try {
      const data = await authApi.register({
        email,
        password,
        displayName,
        koreanLevel,
        country: country || undefined,
        nativeLanguage: nativeLanguage || undefined,
        occupation: occupation || undefined,
        yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : undefined,
        learningGoal: learningGoal || undefined,
      })
      if (data.needsEmailConfirmation) {
        setError("Check your inbox and confirm your email, then sign in.")
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

  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-muted/30 px-4 py-6 selection:bg-blue-500/30 sm:px-6">
      {/* Brand panel — desktop only */}
      <BrandPanel />

      {/* Form panel */}
      <div className="relative flex w-full max-w-[560px] flex-col rounded-3xl border border-border/70 bg-card px-5 py-6 shadow-xl shadow-slate-950/[0.04] sm:px-9 sm:py-8">
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
            <div className="mb-7 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Step {step} of 2</span>
                <div className="flex gap-1.5">
                  <div
                    className={`h-1.5 w-8 rounded-full transition-colors ${step >= 1 ? "bg-blue-500" : "bg-border"}`}
                  />
                  <div
                    className={`h-1.5 w-8 rounded-full transition-colors ${step >= 2 ? "bg-blue-500" : "bg-border"}`}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
                  {step === 1 ? "Create your account" : "Tell us about you"}
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step === 1
                    ? "Built for foreign engineers working in Korean tech companies."
                    : "Help the AI tutor personalise content for your background."}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {step === 1 && (
                <FieldGroup className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel className="text-sm font-medium text-foreground/80">
                        Full name
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          name="displayName"
                          autoComplete="name"
                          placeholder="Your name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          required
                          autoFocus
                          className={inputClass}
                        />
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel className="text-sm font-medium text-foreground/80">
                        Korean level
                      </FieldLabel>
                      <FieldContent>
                        <select
                          value={koreanLevel}
                          onChange={(e) => setKoreanLevel(e.target.value)}
                          className={selectClass}
                        >
                          {KOREAN_LEVELS.map((l) => (
                            <option key={l.value} value={l.value}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </FieldContent>
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel className="text-sm font-medium text-foreground/80">
                      Email
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        type="email"
                        name="email"
                        autoComplete="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className={inputClass}
                      />
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel className="text-sm font-medium text-foreground/80">
                      Password
                    </FieldLabel>
                    <FieldContent>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          autoComplete="new-password"
                          placeholder="At least 8 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={8}
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
              )}

              {step === 2 && (
                <FieldGroup className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel className="text-sm font-medium text-foreground/80">
                        Country
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          placeholder="e.g. Cambodia"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className={inputClass}
                        />
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel className="text-sm font-medium text-foreground/80">
                        Native language
                      </FieldLabel>
                      <FieldContent>
                        <select
                          value={nativeLanguage}
                          onChange={(e) => setNativeLanguage(e.target.value)}
                          className={selectClass}
                        >
                          <option value="">Select language</option>
                          {NATIVE_LANGUAGES.map((l) => (
                            <option key={l} value={l}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </FieldContent>
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel className="text-sm font-medium text-foreground/80">
                        Occupation
                      </FieldLabel>
                      <FieldContent>
                        <select
                          value={occupation}
                          onChange={(e) => setOccupation(e.target.value)}
                          className={selectClass}
                        >
                          <option value="">Select role</option>
                          {OCCUPATIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel className="text-sm font-medium text-foreground/80">
                        Years of experience
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          placeholder="e.g. 3"
                          value={yearsOfExperience}
                          onChange={(e) => setYearsOfExperience(e.target.value)}
                          className={inputClass}
                        />
                      </FieldContent>
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel className="text-sm font-medium text-foreground/80">
                      Learning goal
                    </FieldLabel>
                    <FieldContent>
                      <select
                        value={learningGoal}
                        onChange={(e) => setLearningGoal(e.target.value)}
                        className={selectClass}
                      >
                        <option value="">Select your main goal</option>
                        {LEARNING_GOALS.map((g) => (
                          <option key={g.value} value={g.value}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </FieldContent>
                  </Field>
                </FieldGroup>
              )}

              <div className="flex items-start gap-2.5 rounded-xl bg-blue-500/5 px-3.5 py-3 text-xs leading-relaxed text-blue-700 dark:text-blue-400">
                <Sparkles size={14} className="mt-0.5 shrink-0" />
                <p>
                  {step === 1
                    ? "Your Korean level helps our AI adjust vocabulary and grammar complexity to match your fluency."
                    : "Your background helps the AI focus on developer vocabulary, standup phrases, and workplace scenarios relevant to you."}
                </p>
              </div>

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

              <div className="flex gap-3">
                {step === 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 flex-1 rounded-xl font-semibold"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 flex-1 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 active:scale-[0.99]"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Creating account…
                    </>
                  ) : step === 1 ? (
                    <>
                      Continue
                      <ArrowRight size={17} className="ml-1.5" />
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight size={17} className="ml-1.5" />
                    </>
                  )}
                </Button>
              </div>
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>

        <p className="text-center text-xs leading-relaxed text-muted-foreground/80">
          By creating an account, you agree to our{" "}
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
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950" />
        <div className="absolute -left-20 top-1/3 h-[420px] w-[420px] rounded-full bg-sky-400/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-violet-500/20 blur-[120px]" />
      </div>

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
            Start speaking Korean at work with confidence.
          </h2>
          <p className="text-sm leading-relaxed text-white/70">
            Join foreign developers learning the exact Korean they need for life inside Korean tech
            teams.
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

      <p className="relative z-10 text-xs text-white/50">Free to start · No credit card required</p>
    </aside>
  )
}
