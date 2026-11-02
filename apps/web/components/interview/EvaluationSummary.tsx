"use client"

import { useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { Award, CheckCircle2, GraduationCap, Lightbulb, RotateCcw } from "lucide-react"
import { motion } from "motion/react"

import { PageHero } from "@/components/app/page-hero"
import { AnalyticsCard } from "@/components/interview/AnalyticsCard"
import {
  MOCK_SCORECARD_DISCLAIMER,
  ScoreHonestyNote,
} from "@/components/interview/ScoreHonestyNote"
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar"
import { BlurFade } from "@/components/ui/blur-fade"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Confetti, type ConfettiRef } from "@/components/ui/confetti"
import type { InterviewAnalytics, InterviewEvaluation } from "@/lib/interview"
import type { InterviewModeConfig } from "@/lib/interview-modes"
import type { ScorecardRecord } from "@/lib/interview-history"

// recharts-backed; deferred so the summary paints before the chart chunk loads.
const ScoreTrend = dynamic(
  () => import("@/components/interview/ScoreTrend").then((m) => m.ScoreTrend),
  {
    ssr: false,
    loading: () => <div className="h-48 w-full animate-pulse rounded-3xl bg-muted/20" />,
  },
)

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
} as const

function CompletionCelebration() {
  const confettiRef = useRef<ConfettiRef>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      confettiRef.current?.fire({
        particleCount: 55,
        spread: 64,
        startVelocity: 30,
        origin: { x: 0.5, y: 0.2 },
        colors: ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"],
      })
    }, 220)

    return () => window.clearTimeout(timer)
  }, [])

  return (
    <Confetti
      ref={confettiRef}
      manualstart
      className="pointer-events-none fixed inset-0 z-50 size-full"
    />
  )
}

// End-of-session scorecard: the four exam criteria as scored bars, an overall
// summary, deeper transcript analytics when available, and concrete next-step
// advice. Ends with retry / change-topic.
export function EvaluationSummary({
  mode,
  evaluation,
  analytics,
  history,
  onPracticeAgain,
  onBackToTopics,
}: {
  mode: InterviewModeConfig
  evaluation: InterviewEvaluation
  analytics?: InterviewAnalytics | null
  history: ScorecardRecord[]
  onPracticeAgain: () => void
  onBackToTopics: () => void
}) {
  const { scores, summary, advice } = evaluation
  const overall =
    scores.length > 0
      ? scores.reduce((sum, s) => sum + (s.score / s.max) * 5, 0) / scores.length
      : 0

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-5 pb-12 sm:space-y-6"
    >
      <CompletionCelebration />

      <motion.div variants={itemVariants}>
        <PageHero
          headingLevel="h2"
          eyebrow={`Mock Interview · ${mode.label} · Result`}
          title="Your Evaluation"
          description="An AI read of this session's transcript against the four exam criteria — speaking, pronunciation, vocabulary, and confidence. Treat it as practice feedback, not an official grade."
          stats={[
            { label: "Overall", value: overall ? `${overall.toFixed(1)} / 5` : "—" },
            { label: "Mode", value: mode.label },
            { label: "Criteria", value: String(scores.length || 4) },
          ]}
          actions={
            overall > 0 ? (
              <AnimatedCircularProgressBar
                value={overall}
                max={5}
                gaugePrimaryColor="var(--primary)"
                gaugeSecondaryColor="var(--muted)"
                label="Overall interview score"
                className="size-20 shrink-0 bg-background/40 font-mono text-sm"
              />
            ) : null
          }
        />
      </motion.div>

      {/* Scorecard */}
      <motion.div variants={itemVariants}>
        <Card className="rounded-[1.8rem] border-border bg-card shadow-xl dark:bg-slate-900/40 sm:rounded-[2.2rem]">
          <CardHeader className="border-b border-border/80 px-5 pb-4 pt-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600">
                <Award size={20} strokeWidth={2.5} />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Scorecard</CardTitle>
                <p className="text-xs font-medium text-muted-foreground">
                  Judged on the exam&apos;s four criteria
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-5 sm:pt-6">
            {scores.length > 0 ? (
              scores.map((s) => (
                <div key={s.label} className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-foreground">{s.label}</span>
                    <span className="text-sm font-bold tabular-nums text-blue-600 dark:text-blue-400">
                      {s.score}
                      <span className="text-muted-foreground"> / {s.max}</span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-accent/40">
                    <motion.div
                      className="h-full rounded-full bg-blue-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(s.score / s.max) * 100}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm font-medium text-muted-foreground">
                No scores were returned — see the summary below.
              </p>
            )}
            {scores.length > 0 && <ScoreHonestyNote>{MOCK_SCORECARD_DISCLAIMER}</ScoreHonestyNote>}
          </CardContent>
        </Card>
      </motion.div>

      {/* Overall summary */}
      {summary && (
        <motion.div variants={itemVariants}>
          <Card className="rounded-[1.8rem] border-sky-500/20 bg-sky-500/5 shadow-xl dark:bg-slate-900/40 sm:rounded-[2.2rem]">
            <CardContent className="flex items-start gap-3 p-5 sm:p-6">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                <CheckCircle2 size={18} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-400">
                  Overall
                </p>
                <p className="mt-1.5 text-sm font-medium leading-relaxed text-foreground/90">
                  {summary}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Deeper transcript analysis (structured evaluate route only) */}
      {analytics && (
        <motion.div variants={itemVariants}>
          <AnalyticsCard analytics={analytics} />
        </motion.div>
      )}

      {/* Actionable advice */}
      {advice.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="rounded-[1.8rem] border-border bg-card shadow-xl dark:bg-slate-900/40 sm:rounded-[2.2rem]">
            <CardHeader className="border-b border-border/80 px-5 pb-4 pt-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
                  <Lightbulb size={20} strokeWidth={2.5} />
                </div>
                <CardTitle className="text-base font-bold">What to work on next</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-5">
              {advice.map((tip, i) => (
                <BlurFade key={i} delay={i * 0.06} inView>
                  <div className="flex items-start gap-3 rounded-2xl border border-border bg-accent/5 p-4">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-xs font-bold text-amber-600">
                      {i + 1}
                    </span>
                    <p className="text-sm font-medium leading-relaxed text-foreground/90">{tip}</p>
                  </div>
                </BlurFade>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Trajectory across past mocks — shown once there's more than one. */}
      {history.length > 1 && (
        <motion.div variants={itemVariants}>
          <ScoreTrend records={history} />
        </motion.div>
      )}

      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-3 sm:flex-row sm:justify-center"
      >
        <Button
          onClick={onPracticeAgain}
          className="h-14 w-full rounded-2xl bg-blue-600 px-10 text-base font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-95 sm:w-auto"
        >
          <RotateCcw size={20} className="mr-2" /> Practice Again
        </Button>
        <Button
          variant="outline"
          onClick={onBackToTopics}
          className="h-14 w-full rounded-2xl border-border bg-background px-8 text-base font-bold hover:bg-accent active:scale-95 sm:w-auto"
        >
          <GraduationCap size={20} className="mr-2" /> Back to Topic
        </Button>
      </motion.div>
    </motion.div>
  )
}
