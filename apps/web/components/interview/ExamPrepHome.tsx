"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { ChevronDown, Headphones, ListChecks, Repeat2 } from "lucide-react"

import { ChatGptVoiceCard } from "@/components/interview/ChatGptVoiceCard"
import { ExamHomeHeader } from "@/components/interview/ExamHomeHeader"
import { ExamProgressCard } from "@/components/interview/ExamProgressCard"
import { MockInterviewCard } from "@/components/interview/MockInterviewCard"
import { PersonalExamReviewCard } from "@/components/interview/PersonalExamReviewCard"
import { ScriptCard } from "@/components/interview/ScriptCard"
import { SpeakingTipsCard } from "@/components/interview/SpeakingTipsCard"
import { StudyPack } from "@/components/interview/StudyPack"
import { StudyPlanCard } from "@/components/interview/StudyPlanCard"
import { TodayPracticeCard } from "@/components/interview/TodayPracticeCard"
import { TopicVocabCard } from "@/components/interview/TopicVocabCard"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useExamPrepHome } from "@/hooks/useExamPrepHome"
import { countdownTo, planTodayPractice, summarizeScript } from "@/lib/exam-prep-home"
import type { InterviewTopic } from "@/lib/interview"
import { DRILL_SIZE } from "@/lib/interview-drills"
import type { ScorecardRecord } from "@/lib/interview-history"
import type { InterviewMode } from "@/lib/interview-modes"
import {
  daysRemainingInSeoul,
  recommendedDifficulty,
  type PracticeDifficulty,
} from "@/lib/interview-practice"
import { EXAM_DATE, EXAM_DATE_LABEL, SCRIPT_DUE_DATE, SCRIPT_DUE_LABEL } from "@/lib/study-plan"

// recharts-backed; deferred so the home paints before the chart chunk loads.
const ScoreTrend = dynamic(
  () => import("@/components/interview/ScoreTrend").then((m) => m.ScoreTrend),
  {
    ssr: false,
    loading: () => <div className="h-48 w-full animate-pulse rounded-3xl bg-muted/20" />,
  },
)

const LEVEL_LABELS: Record<PracticeDifficulty, string> = {
  beginner: "Beginner",
  normal: "Normal",
  challenging: "Challenging",
  mixed: "Mixed exam",
}

const PRACTICE_TOOLS = [
  {
    href: "/interview/speaking",
    label: "Choose questions & difficulty",
    description: "Browse the question bank, pick a level, review weak questions.",
    icon: ListChecks,
  },
  {
    href: "/interview/listening",
    label: "Listening practice",
    description: "Audio-only questions: understand before you read.",
    icon: Headphones,
  },
  {
    href: "/interview/repeat",
    label: "Listen & Repeat",
    description: "Say your script back sentence by sentence.",
    icon: Repeat2,
  },
] as const

/**
 * The Exam Prep home: Today's practice, Mock interview, My exam script, and
 * Progress, with everything else one tap away in "More practice & materials".
 */
export function ExamPrepHome({
  topic,
  mode,
  onModeChange,
  onStartMock,
  startingMock,
  mockError,
  history,
  historySyncFailed,
  onRetryHistory,
}: {
  topic: InterviewTopic
  mode: InterviewMode
  onModeChange: (mode: InterviewMode) => void
  onStartMock: () => void
  startingMock: boolean
  mockError: string
  history: ScorecardRecord[]
  historySyncFailed: boolean
  onRetryHistory: () => void
}) {
  const now = new Date()
  // Same default the Speaking drill starts with, so the preview matches.
  const difficulty = recommendedDifficulty(daysRemainingInSeoul(EXAM_DATE, now))
  const { practice, script } = useExamPrepHome(topic.id, difficulty)
  const plan = planTodayPractice({
    questions: practice.questions,
    progress: practice.progress,
    difficulty,
    storedIds: practice.storedIds,
    size: DRILL_SIZE,
    now,
  })
  const scriptDue = countdownTo(SCRIPT_DUE_DATE, now)

  return (
    <div className="space-y-5 pb-12 sm:space-y-6">
      <ExamHomeHeader
        topic={topic}
        examLabel={EXAM_DATE_LABEL}
        exam={countdownTo(EXAM_DATE, now)}
        scriptDueLabel={SCRIPT_DUE_LABEL}
        scriptDue={scriptDue}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <TodayPracticeCard
          plan={plan}
          loading={practice.loading}
          error={practice.error}
          onRetry={practice.retry}
          levelLabel={LEVEL_LABELS[difficulty]}
        />
        <MockInterviewCard
          mode={mode}
          onModeChange={onModeChange}
          onStart={onStartMock}
          starting={startingMock}
          error={mockError}
        />
        <ScriptCard
          summary={summarizeScript(topic, script.snapshot)}
          loading={script.loading}
          syncFailed={script.syncFailed}
          dueLabel={SCRIPT_DUE_LABEL}
          due={scriptDue}
        />
        <ExamProgressCard
          questions={practice.questions}
          progress={practice.progress}
          history={history}
          loading={practice.loading}
          error={practice.error}
          onRetry={practice.retry}
          historySyncFailed={historySyncFailed}
          onRetryHistory={onRetryHistory}
        />
      </div>

      {/* Renders itself only after mount and when there are two+ mocks to compare. */}
      {history.length > 1 && <ScoreTrend records={history} />}

      <Collapsible className="app-surface">
        <CollapsibleTrigger className="group flex min-h-14 w-full items-center justify-between gap-3 px-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <span>
            <span className="block text-sm font-semibold text-foreground">
              More practice &amp; materials
            </span>
            <span className="block text-xs text-muted-foreground">
              Question bank, listening, Q&A review, ChatGPT Voice, study plan, tips, study pack,
              vocabulary
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-6 border-t border-border p-4 sm:p-5">
          <nav aria-label="Practice tools">
            <ul className="grid gap-2 sm:grid-cols-3">
              {PRACTICE_TOOLS.map((tool) => (
                <li key={tool.href}>
                  <Link
                    href={tool.href}
                    className="flex h-full min-h-11 items-start gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <tool.icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>
                      <span className="block text-sm font-semibold text-foreground">
                        {tool.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {tool.description}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <ChatGptVoiceCard topic={topic} />
          {/* Real-story Q&A and question catcher (formerly on the Speaking dashboard). */}
          <PersonalExamReviewCard />
          <TopicVocabCard />
          <StudyPlanCard />
          <SpeakingTipsCard />
          {topic.prep && <StudyPack topic={topic} />}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
