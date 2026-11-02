"use client"

import Link from "next/link"
import { ArrowRight, CalendarDays, ListFilter, RefreshCw, Sparkles, Target } from "lucide-react"

import { PersonalExamReviewCard } from "@/components/interview/PersonalExamReviewCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { InterviewAttempt } from "@/lib/api/interview"
import {
  difficultyCounts,
  difficultyRecommendationLabel,
  mostDifficultQuestions,
  summarizeQuestionProgress,
  selectTodaysQueue,
  type PracticeDifficulty,
  type QuestionBankItem,
  type QuestionProgress,
} from "@/lib/interview-practice"
import { EXAM_DATE_LABEL } from "@/lib/study-plan"
import { cn } from "@/lib/utils"

const LEVELS: { id: PracticeDifficulty; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "normal", label: "Normal" },
  { id: "challenging", label: "Challenging" },
  { id: "mixed", label: "Mixed Exam Mode" },
]

interface ExamPracticeDashboardProps {
  questions: QuestionBankItem[]
  progress: Record<string, QuestionProgress>
  latestAttempt: InterviewAttempt | null
  daysRemaining: number
  recommended: PracticeDifficulty
  difficulty: PracticeDifficulty
  loading: boolean
  error: string
  onDifficultyChange: (value: PracticeDifficulty) => void
  onPracticeToday: () => void
  onAiRandom: () => void
  onReviewWeak: () => void
  onBrowse: () => void
}

export function ExamPracticeDashboard({
  questions,
  progress,
  latestAttempt,
  daysRemaining,
  recommended,
  difficulty,
  loading,
  error,
  onDifficultyChange,
  onPracticeToday,
  onAiRandom,
  onReviewWeak,
  onBrowse,
}: ExamPracticeDashboardProps) {
  const counts = difficultyCounts(questions)
  const summary = summarizeQuestionProgress(questions, progress)
  const weakest = mostDifficultQuestions(questions, progress, 3)
  const todayPreview = selectTodaysQueue(questions, progress, difficulty, 5)

  return (
    <div className="space-y-5 sm:space-y-6">
      <Card className="rounded-2xl border-blue-500/20 bg-card shadow-sm">
        <CardContent className="p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-none bg-blue-500/10 text-blue-700 dark:text-blue-300">
                  K-Specialist Exam Prep
                </Badge>
                <span className="text-sm font-medium text-muted-foreground">
                  Q&A · {EXAM_DATE_LABEL}
                </span>
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Train the questions you are most likely to hear
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                Catch the keyword → choose your real story → answer in 1–3 short sentences. Clear
                Korean matters more than long answers.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 sm:px-5">
              <CalendarDays className="size-5 text-blue-600" aria-hidden="true" />
              <div>
                <p className="text-3xl font-bold tabular-nums text-foreground">{daysRemaining}</p>
                <p className="text-xs font-medium text-muted-foreground">
                  days until {EXAM_DATE_LABEL}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <PersonalExamReviewCard />

      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Choose today&apos;s level</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Recommended now:{" "}
                <span className="font-medium text-foreground">
                  {difficultyRecommendationLabel(recommended)}
                </span>
                . You can override it.
              </p>
            </div>
            <Badge variant="outline">
              Recommended: {LEVELS.find((level) => level.id === recommended)?.label}
            </Badge>
          </div>
          <div
            className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4"
            role="radiogroup"
            aria-label="Practice difficulty"
          >
            {LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                role="radio"
                aria-checked={difficulty === level.id}
                onClick={() => onDifficultyChange(level.id)}
                className={cn(
                  "min-h-14 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  difficulty === level.id
                    ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                    : "border-border bg-background hover:bg-accent",
                )}
              >
                <span className="block text-sm font-semibold">{level.label}</span>
                <span className="text-xs text-muted-foreground">{counts[level.id]} available</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-2xl border-blue-500/30 bg-card shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Target className="size-5 text-blue-600" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-foreground">Today&apos;s 5</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Focus on must-practise, new, and weak questions first. Listen once before reading when
              possible.
            </p>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <ol className="mt-4 space-y-2.5 border-l border-border pl-4 text-foreground">
              {todayPreview.map((question, index) => (
                <li
                  key={question.id}
                  lang="ko"
                  className="break-words text-base font-medium leading-7"
                >
                  <span className="mr-2 text-sm text-muted-foreground">{index + 1}.</span>
                  {question.questionKo}
                </li>
              ))}
            </ol>
            <Button
              onClick={onPracticeToday}
              disabled={loading || questions.length === 0}
              className="mt-5 h-12 w-full rounded-xl bg-blue-600 text-base font-semibold text-white hover:bg-blue-700"
            >
              {loading ? (
                <RefreshCw className="mr-2 size-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 size-4" />
              )}
              Practice Today&apos;s 5
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-foreground">Your progress</h2>
            <p className="mt-3 text-xl font-semibold text-foreground">
              {summary.practiced} / {summary.total} practised
            </p>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <span className="text-muted-foreground">Strong</span>
              <span className="text-right font-medium">{summary.strong}</span>
              <span className="text-muted-foreground">Improving</span>
              <span className="text-right font-medium">{summary.improving}</span>
              <span className="text-muted-foreground">Need another retry</span>
              <span className="text-right font-medium">{summary.needsRetry}</span>
              <span className="text-muted-foreground">New</span>
              <span className="text-right font-medium">{summary.newCount}</span>
              <span className="text-muted-foreground">Latest mock</span>
              <span className="text-right font-medium">
                {latestAttempt ? `${latestAttempt.overall.toFixed(1)} / 5` : "Not taken"}
              </span>
            </div>
            {summary.practiced === 0 ? (
              <p className="mt-4 rounded-xl bg-muted/50 p-3 text-sm leading-6 text-muted-foreground">
                Complete Today&apos;s 5 to begin identifying your weak questions.
              </p>
            ) : weakest.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground">Weakest questions</p>
                <ul className="mt-2 space-y-1.5 text-sm text-foreground">
                  {weakest.map((question) => (
                    <li key={question.id} className="line-clamp-1 list-item list-disc">
                      {question.questionKo}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Button variant="outline" onClick={onAiRandom} className="h-11 rounded-xl">
          <Sparkles className="mr-2 size-4" />
          AI Random Questions
        </Button>
        <Button asChild variant="outline" className="h-11 rounded-xl">
          <Link href="/interview">
            <Target className="mr-2 size-4" />
            Full Mock Interview
          </Link>
        </Button>
        <Button variant="outline" onClick={onReviewWeak} className="h-11 rounded-xl">
          <RefreshCw className="mr-2 size-4" />
          Review Weak Questions
        </Button>
        <Button variant="outline" onClick={onBrowse} className="h-11 rounded-xl">
          <ListFilter className="mr-2 size-4" />
          Browse Question Bank
        </Button>
      </div>
      <p className="text-center text-xs leading-5 text-muted-foreground">
        Today&apos;s 5 is the main path. Use AI Random only for extra variety after the core
        questions feel comfortable.
      </p>
    </div>
  )
}
