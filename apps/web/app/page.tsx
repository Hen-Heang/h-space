"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  BookOpenCheck,
  BrainCircuit,
  Target,
  MessageSquareText,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Send,
  Zap,
  CheckCircle2,
  Languages,
  Headphones,
  Drama,
  BookOpenText,
  Flame,
} from "lucide-react"
import { motion } from "motion/react"

import { ThemeToggle } from "@/components/theme-toggle"
import { AboutHSpace } from "@/components/home/AboutHSpace"
import { MyAppsSection } from "@/components/home/MyAppsSection"
import { Button } from "@/components/ui/button"
import { isAuthenticated } from "@/lib/auth-store"

const features = [
  {
    title: "AI Korean Coach",
    description:
      "Ask anything in English and get natural Korean back — grammar, politeness levels, and real workplace phrasing, 24/7.",
    icon: MessageSquareText,
  },
  {
    title: "Workplace Scenarios",
    description:
      "Role-play standups, code reviews, and team meetings — the situations you actually face on a Korean dev team.",
    icon: Drama,
  },
  {
    title: "Developer Vocabulary",
    description:
      "Spaced-repetition decks with audio, tuned to technical and on-the-job terms so the right word sticks.",
    icon: BookOpenCheck,
  },
  {
    title: "Foundations",
    description:
      "Build from Hangul up — grammar and core patterns explained for engineers who like things structured.",
    icon: Languages,
  },
  {
    title: "Listening & Reading",
    description:
      "Train your ear with audio drills and read bite-size passages graded to your level.",
    icon: Headphones,
  },
  {
    title: "Exam & Interview Prep",
    description:
      "Rehearse Korean tech interviews and exam-style questions with instant, actionable feedback.",
    icon: GraduationCap,
  },
  {
    title: "Daily Phrase & Dev Notes",
    description:
      "A fresh phrase every day, plus your own notebook to save words and corrections as you go.",
    icon: BookOpenText,
  },
  {
    title: "Goals & Dashboard",
    description:
      "Set learning goals, break them into daily to-dos, and keep your streak on a focused dashboard.",
    icon: Target,
  },
]

const processSteps = [
  {
    step: "1",
    title: "Do real work",
    description:
      "Chat with the AI coach, run workplace scenarios, and decode real messages from your Korean team.",
    icon: MessageSquareText,
  },
  {
    step: "2",
    title: "Get AI feedback",
    description:
      "Instant corrections, tone guidance, and natural alternatives for everything you write and say.",
    icon: Sparkles,
  },
  {
    step: "3",
    title: "Everything syncs",
    description:
      "One cloud for your data and AI — scripting, goals, and progress stay in sync between phone and PC.",
    icon: Zap,
  },
  {
    step: "4",
    title: "Personalized practice",
    description:
      "Your mistakes become targeted drills and spaced-repetition reviews, so weak spots get fixed fast.",
    icon: Target,
  },
]

const chatMessages = [
  { role: "you", text: 'How do I say "I finished the deployment" in Korean?' },
  {
    role: "ai",
    text: "배포 완료했습니다 ✓ — Natural & professional. 배포 = deployment, 완료 = completed.",
  },
  { role: "you", text: "More formal for team lead?" },
  {
    role: "ai",
    text: "배포 완료하였습니다 — Use with 팀장님. Sounds polished and respectful in standups.",
  },
]

const workspaceAreas = ["Learning", "Finance", "AI engineering", "Productivity", "Development"]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
} as const

export default function Home() {
  const router = useRouter()

  // The PWA's start_url and any bookmark to "/" land here regardless of
  // auth state — this is a static marketing page, so already-logged-in
  // users need to be bounced to the real app instead of seeing it again.
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/home")
    }
  }, [router])

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-background text-foreground">
      {/* Ambient brand glow behind the hero — the icon's blue and violet.
          (The old `bg-gradient-radial` isn't a Tailwind v4 utility, so the
          previous glow never rendered.) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[900px] overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-[70%] rounded-full bg-brand-from/15 blur-3xl dark:bg-brand-from/10" />
        <div className="absolute -top-24 left-1/2 h-[480px] w-[480px] -translate-x-[10%] rounded-full bg-brand-to/12 blur-3xl dark:bg-brand-to/10" />
      </div>

      <div className="relative z-10">
        {/* Navbar */}
        <header className="sticky top-0 z-50 border-b border-border/40 bg-background/60 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
            <Link href="/" className="group flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-[22.5%] transition-transform group-hover:scale-105">
                <Image
                  src="/icons/h-space-mark.svg"
                  unoptimized
                  alt=""
                  width={36}
                  height={36}
                  className="h-full w-full"
                />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">H-Space</span>
            </Link>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <div className="hidden h-6 w-px bg-border/60 sm:block mx-2" />
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="hidden font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
              >
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full px-5">
                <Link href="/register">Get started</Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="relative px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-20">
              {/* Left — copy */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="flex flex-col"
              >
                <motion.div
                  variants={itemVariants}
                  className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary"
                >
                  <BrainCircuit aria-hidden="true" size={14} />
                  Personal software ecosystem
                </motion.div>

                <motion.h1
                  variants={itemVariants}
                  className="mt-6 text-[2.8rem] font-bold leading-[1.08] tracking-tight text-foreground sm:text-[4.2rem]"
                >
                  My Projects.{" "}
                  <span className="relative inline-block">
                    <span className="text-brand-gradient">One Space.</span>
                    <motion.span
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.8, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
                      className="bg-brand-gradient absolute -bottom-1 left-0 right-0 h-[3px] origin-left rounded-full opacity-60"
                    />
                  </span>
                </motion.h1>

                <motion.p
                  variants={itemVariants}
                  className="mt-7 text-lg leading-relaxed text-muted-foreground sm:text-xl sm:leading-relaxed max-w-[520px]"
                >
                  H-Space is my personal software workspace and engineering portfolio. It brings
                  together the real applications I build for everyday learning, finance, AI,
                  productivity, and software development.
                </motion.p>

                <motion.div
                  variants={itemVariants}
                  className="mt-10 flex flex-col gap-3 sm:flex-row"
                >
                  <Button asChild size="lg" className="h-14 rounded-xl px-8 text-base">
                    <Link href="#my-apps">
                      Explore my apps
                      <ArrowRight size={18} className="ml-2" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-14 rounded-xl px-8 text-base font-medium"
                  >
                    <Link href="/login">Open H-Space</Link>
                  </Button>
                </motion.div>

                {/* Workspace areas */}
                <motion.div variants={itemVariants} className="mt-10 flex flex-wrap gap-2">
                  {workspaceAreas.map((area) => (
                    <span
                      key={area}
                      className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                    >
                      {area}
                    </span>
                  ))}
                </motion.div>
              </motion.div>

              {/* Right — chat preview */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                className="relative"
              >
                {/* Glow */}
                <div
                  aria-hidden="true"
                  className="bg-brand-gradient absolute inset-0 rounded-3xl opacity-20 blur-3xl"
                />

                {/* Floating vocab chip */}
                <motion.div
                  initial={{ opacity: 0, x: 30, y: -10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.1 }}
                  className="absolute -right-4 top-28 z-10 hidden items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 shadow-lg lg:flex"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookOpenCheck aria-hidden="true" size={14} />
                  </div>
                  <div>
                    <p lang="ko" className="text-xs font-semibold text-foreground">
                      배포
                    </p>
                    <p className="text-xs text-muted-foreground">deployment</p>
                  </div>
                  <div className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    +2 XP
                  </div>
                </motion.div>

                {/* Floating streak chip */}
                <motion.div
                  initial={{ opacity: 0, x: -30, y: 10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.3 }}
                  className="absolute -left-4 bottom-24 z-10 hidden items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 shadow-lg lg:flex"
                >
                  <Flame aria-hidden="true" className="size-5 text-amber-500" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">7-day streak</p>
                    <p className="text-xs text-muted-foreground">Keep it up!</p>
                  </div>
                </motion.div>

                {/* Phone frame mockup */}
                <div className="relative mx-auto w-full max-w-[360px]">
                  <div className="relative overflow-hidden rounded-3xl border-[8px] border-slate-900 bg-background shadow-2xl dark:border-slate-800">
                    {/* Notch */}
                    <div className="absolute left-1/2 top-0 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-slate-900 dark:bg-slate-800" />

                    <div className="flex h-[640px] flex-col">
                      {/* App header */}
                      <div className="flex items-center justify-between border-b border-border/50 bg-background/80 px-6 pb-4 pt-10 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                          <Image
                            src="/hengo-icon.png"
                            alt=""
                            width={40}
                            height={40}
                            className="size-10 rounded-xl"
                          />
                          <div>
                            <p className="text-xs font-bold leading-none text-foreground">
                              AI Coach
                            </p>
                            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                              <span
                                aria-hidden="true"
                                className="size-1.5 rounded-full bg-success"
                              />
                              Online now
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1">
                          <Flame aria-hidden="true" className="size-3.5 text-amber-600" />
                          <span className="text-xs font-bold text-amber-600">7</span>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 space-y-3.5 overflow-y-auto p-5 pb-3">
                        {chatMessages.map((msg, i) => (
                          <div
                            key={i}
                            className={`flex ${msg.role === "you" ? "justify-end" : "justify-start"}`}
                          >
                            {msg.role === "ai" && (
                              <Image
                                src="/hengo-icon.png"
                                alt=""
                                width={24}
                                height={24}
                                className="mr-2 mt-1 size-6 shrink-0 rounded-md"
                              />
                            )}
                            <div
                              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                msg.role === "you"
                                  ? "rounded-tr-sm bg-primary font-medium text-primary-foreground"
                                  : "rounded-tl-sm border border-border bg-muted/60 text-foreground"
                              }`}
                            >
                              {msg.text}
                            </div>
                          </div>
                        ))}

                        {/* Animated typing */}
                        <div className="flex items-center gap-2">
                          <Image
                            src="/hengo-icon.png"
                            alt=""
                            width={24}
                            height={24}
                            className="size-6 rounded-md"
                          />
                          <div className="flex gap-1 rounded-2xl rounded-tl-sm border border-border bg-muted/60 px-4 py-3.5">
                            {[0, 1, 2].map((j) => (
                              <motion.span
                                key={j}
                                animate={{ y: [0, -4, 0] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: j * 0.15 }}
                                className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Quick phrase chips */}
                      <div className="flex gap-2 overflow-x-auto px-5 pb-2 no-scrollbar">
                        {["오늘 배포했어요", "회의 중입니다", "잠깐만요"].map((phrase) => (
                          <div
                            key={phrase}
                            lang="ko"
                            className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                          >
                            {phrase}
                          </div>
                        ))}
                      </div>

                      {/* Input bar */}
                      <div className="border-t border-border/50 bg-background/80 p-4 pt-3 backdrop-blur-md">
                        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/60 px-4 py-3">
                          <span className="flex-1 text-xs text-muted-foreground font-medium">
                            Ask in English...
                          </span>
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                            <Send aria-hidden="true" size={14} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-10 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <MyAppsSection />
          <AboutHSpace />
        </div>

        {/* Hengo Learning features */}
        <section className="relative px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16 text-center"
            >
              <p className="app-kicker">Hengo Learning</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Hengo Learning stays focused on{" "}
                <span className="text-muted-foreground italic font-medium">workplace</span> Korean.
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
                From an AI coach and workplace scenarios to developer vocabulary, listening,
                reading, and interview prep — Hengo Learning covers the Korean you actually use on
                the job as one dedicated part of H-Space.
              </p>
            </motion.div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, i) => {
                const Icon = feature.icon
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="h-full rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/30 sm:p-7"
                  >
                    <div className="inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                      <Icon aria-hidden="true" size={22} />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-foreground">{feature.title}</h3>
                    <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="relative px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16 text-center"
            >
              <p className="app-kicker">How it works</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                One loop, from{" "}
                <span className="text-muted-foreground italic font-medium">real work</span> to
                fluency.
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
                Do real work in Korean, get AI feedback, and let everything sync between your phone
                and PC — Hengo Learning turns your mistakes into personalized practice.
              </p>
            </motion.div>

            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              {/* Diagram */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative"
              >
                <div
                  aria-hidden="true"
                  className="bg-brand-gradient absolute inset-0 rounded-3xl opacity-20 blur-3xl"
                />
                <div className="relative overflow-hidden rounded-3xl border border-border bg-slate-950 shadow-2xl">
                  <Image
                    src="/app-process.png"
                    alt="Diagram of the Hengo learning loop: do real work, get AI feedback, sync through the cloud, and practice with personalized drills across phone and desktop"
                    width={1024}
                    height={1024}
                    className="h-auto w-full"
                  />
                </div>
              </motion.div>

              {/* Steps */}
              <div className="space-y-8">
                {processSteps.map((step, i) => {
                  const Icon = step.icon
                  return (
                    <motion.div
                      key={step.title}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="flex gap-5"
                    >
                      <div className="flex flex-col items-center">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon aria-hidden="true" size={22} />
                        </div>
                        {i < processSteps.length - 1 && (
                          <div className="mt-2 w-px flex-1 bg-border/60" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-primary">
                            Step {step.step}
                          </span>
                        </div>
                        <h3 className="mt-1 text-lg font-semibold text-foreground">{step.title}</h3>
                        <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="border-y border-border/40 bg-accent/10 px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="space-y-8"
              >
                <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                  Made for engineers, not tourists.
                </h2>
                <div className="space-y-6">
                  {[
                    {
                      title: "Learn the Korean you'll actually use",
                      desc: "Standup updates, code-review comments, and meeting phrases — not phrasebook small talk.",
                    },
                    {
                      title: "An AI coach that gets context",
                      desc: "Ask in English, get natural Korean back with grammar, politeness levels, and examples — anytime.",
                    },
                    {
                      title: "Stay consistent with goals & streaks",
                      desc: "Set learning goals, drill vocab with spaced repetition, and keep your streak on a focused dashboard.",
                    },
                  ].map((benefit) => (
                    <div key={benefit.title} className="flex gap-4">
                      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <CheckCircle2 aria-hidden="true" size={16} />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground">{benefit.title}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">{benefit.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
              >
                <div className="relative flex h-full flex-col justify-between p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        This week
                      </p>
                      <p className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
                        Daily goal: 87%
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5">
                      <Flame aria-hidden="true" className="size-4 text-amber-600" />
                      <span className="text-sm font-bold text-amber-600">12-day streak</span>
                    </div>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: "87%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                      className="bg-brand-gradient h-2 rounded-full"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { term: "배포", gloss: "deployment", done: true },
                      { term: "회의록", gloss: "meeting notes", done: true },
                      { term: "마감일", gloss: "deadline", done: false },
                    ].map((vocab) => (
                      <div
                        key={vocab.term}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                          vocab.done
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "border-border bg-background/60 text-muted-foreground"
                        }`}
                      >
                        {vocab.done && <CheckCircle2 size={12} />}
                        <span lang="ko" className="font-semibold">
                          {vocab.term}
                        </span>
                        <span className="opacity-70">{vocab.gloss}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-3xl bg-brand-surface p-10 text-center sm:p-20 dark:border dark:border-white/10"
            >
              {/* The icon's blue and violet, glowing in from the corners */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand-from/35 blur-[80px]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-brand-to/35 blur-[80px]"
              />

              <div className="relative z-10">
                <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  Ready to speak Korean at work?
                </h2>
                <p className="mx-auto mt-6 max-w-xl text-lg text-white/75">
                  Practice with an AI coach, master developer vocabulary, and rehearse real
                  workplace scenarios. Start free today, no card required.
                </p>
                <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                  <Button
                    asChild
                    size="lg"
                    className="h-14 rounded-xl bg-white px-10 text-base text-brand-surface hover:bg-white/90"
                  >
                    <Link href="/register">Create free account</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="ghost"
                    className="h-14 rounded-xl px-10 text-base text-white hover:bg-white/10 hover:text-white"
                  >
                    <Link href="/login">Sign in</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/40 bg-background/50 px-4 py-12 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-[22.5%]">
                  <Image
                    src="/icons/h-space-mark.svg"
                    unoptimized
                    alt=""
                    width={32}
                    height={32}
                    className="h-full w-full"
                  />
                </div>
                <span className="text-sm font-bold tracking-tight text-foreground">H-Space</span>
                <span className="text-xs text-muted-foreground ml-4">
                  © 2026 H-Space. All rights reserved.
                </span>
              </div>
              <div className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  Privacy
                </Link>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  Terms
                </Link>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
