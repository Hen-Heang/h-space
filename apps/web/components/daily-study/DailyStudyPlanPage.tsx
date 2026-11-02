"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  BookOpenCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Headphones,
  Languages,
  Pause,
  Play,
  RotateCcw,
  Save,
  SkipForward,
  Sparkles,
  Target,
  TimerReset,
} from "lucide-react"
import { toast } from "sonner"

import { ExpressionCard } from "@/components/daily-study/ExpressionCard"
import { VoicePractice } from "@/components/daily-study/VoicePractice"
import { Button } from "@/components/ui/button"
import { ErrorBanner } from "@/components/ui/error-banner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { SpeakButton } from "@/components/ui/SpeakButton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useDailyStudyPlan } from "@/hooks/useDailyStudyPlan"
import { dailyStudyPlanApi, progressApi } from "@/lib/api"
import {
  MODE_LABELS,
  MODE_TOTAL_MINUTES,
  WEEKDAY_TOPICS,
  nextStudyActivity,
  type DailyStudyActivity,
  type DailyStudyMode,
  type DailyStudyPlan,
} from "@/lib/daily-study-plan"
import { cn } from "@/lib/utils"

export function DailyStudyPlanPage() {
  const study = useDailyStudyPlan()
  const [openActivity, setOpenActivity] = useState<string | null>(null)
  const [skipReasons, setSkipReasons] = useState<Record<string, string>>({})
  const dashboard = useQuery({
    queryKey: ["daily-plan-dashboard"],
    queryFn: progressApi.getDashboard,
  })
  const streak = useQuery({ queryKey: ["daily-plan-streak"], queryFn: progressApi.getStreak })
  const weekly = useQuery({
    queryKey: ["daily-plan-weekly"],
    queryFn: dailyStudyPlanApi.getWeeklyProgress,
  })

  const planWithLiveActivities = useMemo<DailyStudyPlan | null>(
    () => (study.plan ? { ...study.plan, activities: study.activities } : null),
    [study.activities, study.plan],
  )
  const next = nextStudyActivity(study.activities)
  const speakingMinutes = Math.floor(
    study.activities
      .filter((activity) => activity.type === "roleplay" || activity.type === "correction_retry")
      .reduce((sum, activity) => sum + activity.completedSeconds, 0) / 60,
  )

  if (study.loading) {
    return (
      <main className="space-y-4 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-12">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </main>
    )
  }

  if (!study.plan || !planWithLiveActivities) {
    return (
      <main className="pb-24">
        <ErrorBanner>
          {study.error || "No daily plan is available yet."}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void study.reload()}
            className="ml-3"
          >
            Retry
          </Button>
        </ErrorBanner>
      </main>
    )
  }

  const plan = planWithLiveActivities
  const today = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date())

  function startActivity(activity: DailyStudyActivity) {
    study.start(activity.id)
    setOpenActivity(activity.id)
  }

  function completeActivity(activity: DailyStudyActivity) {
    study.complete(activity.id)
    const following = study.activities.find(
      (item) => item.id !== activity.id && item.status === "pending",
    )
    toast.success("Activity completed", {
      description: following ? `Next: ${following.title}` : "Your daily plan is complete.",
    })
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 overflow-x-clip pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-12">
      <section className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-sm">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.35fr_0.65fr] lg:p-9">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-300">{today} · Asia/Seoul</p>
            <div className="mt-5 flex items-start gap-3">
              <div className="mt-1 rounded-xl bg-blue-500/20 p-2 text-blue-300">
                <Sparkles size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-300">Study now</p>
                <h1 className="mt-1 break-keep text-2xl font-bold leading-tight sm:text-3xl [overflow-wrap:anywhere]">
                  {next ? next.title : "Daily plan complete"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                  {next
                    ? `${next.estimatedMinutes} minutes · starts at ${next.plannedStart}. ${next.description}`
                    : "Save your reflection and return tomorrow for a new KST study plan."}
                </p>
              </div>
            </div>
            {next && (
              <Button
                type="button"
                onClick={() =>
                  next.status === "active" ? study.pause(next.id) : startActivity(next)
                }
                className="mt-6 min-h-12 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-500 sm:w-auto sm:px-7"
              >
                {next.status === "active" ? (
                  <Pause size={18} className="mr-2" />
                ) : (
                  <Play size={18} className="mr-2" />
                )}
                {next.status === "active" ? "Pause session" : "Start next activity"}
              </Button>
            )}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-300">Daily completion</p>
              <p className="text-2xl font-bold">{study.progress.percentage}%</p>
            </div>
            <div
              role="progressbar"
              aria-label="Daily study completion"
              aria-valuenow={study.progress.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10"
            >
              <div
                className="h-full rounded-full bg-blue-500 transition-[width] motion-reduce:transition-none"
                style={{ width: `${study.progress.percentage}%` }}
              />
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <Metric
                label="Completed"
                value={`${study.progress.completedCount}/${study.activities.length}`}
              />
              <Metric label="Focused" value={`${study.progress.focusedMinutes} min`} />
              <Metric label="Speaking" value={`${speakingMinutes} min`} />
              <Metric label="Due review" value={`${dashboard.data?.stats.dueReviews ?? "—"}`} />
            </dl>
          </div>
        </div>
      </section>

      {study.error && <ErrorBanner>{study.error}</ErrorBanner>}

      {/* One compact row instead of four cards — the same four values, none
          of which the hero above repeats. */}
      <section
        aria-label="Daily summary"
        className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
      >
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm lg:grid-cols-4">
          <SummaryCard icon={Target} label="Today’s topic" value={plan.topicLabel} />
          <SummaryCard
            icon={CalendarClock}
            label="Current mode"
            value={`${MODE_LABELS[plan.mode]} · ${MODE_TOTAL_MINUTES[plan.mode]} min`}
          />
          <SummaryCard
            icon={RotateCcw}
            label="Study streak"
            value={`${streak.data?.streakDays ?? 0} days`}
          />
          <SummaryCard
            icon={TimerReset}
            label="This week"
            value={`${weekly.data?.focusedMinutes ?? 0} focused min`}
          />
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <h2 className="font-semibold">Choose today’s pace</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Changing mode resets today’s activity schedule.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {(Object.keys(MODE_LABELS) as DailyStudyMode[]).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => study.changeMode(mode)}
                  aria-pressed={plan.mode === mode}
                  className={cn(
                    "min-h-14 rounded-xl border px-3 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    plan.mode === mode
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <span className="block text-sm font-semibold">{MODE_LABELS[mode]}</span>
                  <span className="text-xs text-muted-foreground">
                    {MODE_TOTAL_MINUTES[mode]} minutes
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="daily-topic" className="font-semibold">
              Today’s topic
            </label>
            <p className="mt-1 text-sm text-muted-foreground">
              The weekday suggestion is automatic, but you can change it.
            </p>
            <Select value={plan.topicKey} onValueChange={study.changeTopic}>
              <SelectTrigger id="daily-topic" className="mt-4 min-h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAY_TOPICS.map((topic) => (
                  <SelectItem key={topic.key} value={topic.key}>
                    {topic.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-3">
              <div>
                <p className="text-sm font-medium">Show romanization</p>
                <p className="text-xs text-muted-foreground">
                  Helpful now—gradually try short sections without it.
                </p>
              </div>
              <Switch
                checked={plan.romanizationVisible}
                onCheckedChange={study.setRomanizationVisible}
                aria-label="Show Korean romanization"
              />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="schedule-title">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 id="schedule-title" className="text-xl font-bold">
              Today’s schedule
            </h2>
            <p className="text-sm text-muted-foreground">
              Only one timer can run at a time. Times are editable.
            </p>
          </div>
          <span className="text-sm font-semibold">{study.progress.plannedMinutes} min planned</span>
        </div>
        <div className="space-y-3">
          {study.activities.map((activity, index) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              index={index}
              open={openActivity === activity.id}
              skipReason={skipReasons[activity.id] ?? ""}
              onSkipReason={(value) =>
                setSkipReasons((current) => ({ ...current, [activity.id]: value }))
              }
              onToggle={() =>
                setOpenActivity((current) => (current === activity.id ? null : activity.id))
              }
              onStart={() => startActivity(activity)}
              onPause={() => study.pause(activity.id)}
              onComplete={() => completeActivity(activity)}
              onSkip={() => study.skip(activity.id, skipReasons[activity.id] ?? null)}
              onTimeChange={(value) => study.changeTime(activity.id, value)}
            >
              <ActivityMaterial
                activity={activity}
                plan={plan}
                onAttempt={study.recordAttempt}
                onVoiceFinished={() => completeActivity(activity)}
              />
            </ActivityCard>
          ))}
        </div>
      </section>

      <section aria-labelledby="study-kit-title" className="space-y-5">
        <div>
          <h2 id="study-kit-title" className="text-xl font-bold">
            Today’s complete study kit
          </h2>
          <p className="text-sm text-muted-foreground">
            Five reviews, five words, three expressions, one dialogue and five spoken questions.
          </p>
        </div>

        <StudyGroup title="Five review cards" icon={BookOpenCheck}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {plan.content.reviewCards.map((item) => (
              <ExpressionCard
                key={item.id}
                expression={item}
                showRomanization={plan.romanizationVisible}
              />
            ))}
          </div>
        </StudyGroup>

        <StudyGroup title="Five useful words" icon={Languages}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {plan.content.usefulWords.map((item) => (
              <ExpressionCard
                key={item.id}
                expression={item}
                showRomanization={plan.romanizationVisible}
              />
            ))}
          </div>
        </StudyGroup>

        <StudyGroup title="Three practical expressions" icon={Sparkles}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {plan.content.practicalExpressions.map((item) => (
              <ExpressionCard
                key={item.id}
                expression={item}
                showRomanization={plan.romanizationVisible}
              />
            ))}
          </div>
        </StudyGroup>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-blue-600" />
            <h2 className="font-semibold">Today’s real-world mission</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed">{plan.content.realWorldMission}</p>
          <Textarea
            defaultValue={plan.missionResult}
            onBlur={(event) => study.updatePlanText("missionResult", event.target.value)}
            placeholder="What happened? Write a short result."
            className="mt-4 min-h-24"
            aria-label="Real-world mission result"
          />
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Save size={12} /> Saves when you leave the field.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <h2 className="font-semibold">Short daily reflection</h2>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{plan.content.reflectionPrompt}</p>
          <Textarea
            defaultValue={plan.reflection}
            onBlur={(event) => study.updatePlanText("reflection", event.target.value)}
            placeholder="Today I could… Tomorrow I will repeat…"
            className="mt-4 min-h-24"
            aria-label="Daily study reflection"
          />
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Save size={12} /> Saves when you leave the field.
          </p>
        </div>
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-1 font-semibold text-white">{value}</dd>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon aria-hidden="true" size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="break-words font-semibold leading-snug">{value}</dd>
      </div>
    </div>
  )
}

function ActivityCard({
  activity,
  index,
  open,
  skipReason,
  onSkipReason,
  onToggle,
  onStart,
  onPause,
  onComplete,
  onSkip,
  onTimeChange,
  children,
}: {
  activity: DailyStudyActivity
  index: number
  open: boolean
  skipReason: string
  onSkipReason: (value: string) => void
  onToggle: () => void
  onStart: () => void
  onPause: () => void
  onComplete: () => void
  onSkip: () => void
  onTimeChange: (value: string) => void
  children: React.ReactNode
}) {
  const seconds = activity.completedSeconds
  const targetSeconds = activity.estimatedMinutes * 60
  const timerProgress = Math.min(100, Math.round((seconds / targetSeconds) * 100))
  const statusIcon =
    activity.status === "completed" ? (
      <CheckCircle2 size={21} className="text-emerald-600" />
    ) : activity.status === "skipped" ? (
      <SkipForward size={21} className="text-muted-foreground" />
    ) : activity.status === "active" ? (
      <Play size={21} className="text-blue-600" />
    ) : (
      <Circle size={21} className="text-muted-foreground/60" />
    )

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm",
        activity.status === "active" ? "border-blue-500/50" : "border-border",
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="mt-1 shrink-0">{statusIcon}</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  Activity {index + 1} · {activity.type.replace("_", " ")}
                </p>
                <h3 className="mt-1 break-words font-semibold">{activity.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{activity.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <label className="sr-only" htmlFor={`time-${activity.id}`}>
                  Start time for {activity.title}
                </label>
                <input
                  id={`time-${activity.id}`}
                  type="time"
                  value={activity.plannedStart}
                  onChange={(event) => onTimeChange(event.target.value)}
                  className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                  {activity.estimatedMinutes} min
                </span>
              </div>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  activity.status === "completed" ? "bg-emerald-500" : "bg-blue-500",
                )}
                style={{ width: `${activity.status === "completed" ? 100 : timerProgress}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="capitalize">{activity.status}</span>
              <span className="tabular-nums">
                {formatSeconds(seconds)} / {activity.estimatedMinutes}:00
              </span>
            </div>

            {activity.status !== "completed" && activity.status !== "skipped" && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
                {activity.status === "active" ? (
                  <Button type="button" variant="outline" onClick={onPause} className="min-h-11">
                    <Pause size={16} className="mr-2" /> Pause
                  </Button>
                ) : (
                  <Button type="button" onClick={onStart} className="min-h-11">
                    <Play size={16} className="mr-2" /> {seconds > 0 ? "Resume" : "Start"}
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={onComplete} className="min-h-11">
                  <Check size={16} className="mr-2" /> Complete
                </Button>
                <Button type="button" variant="ghost" onClick={onToggle} className="min-h-11">
                  Material{" "}
                  <ChevronDown
                    size={16}
                    className={cn("ml-2 transition-transform", open && "rotate-180")}
                  />
                </Button>
              </div>
            )}

            {activity.status !== "completed" && activity.status !== "skipped" && open && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={skipReason}
                  onChange={(event) => onSkipReason(event.target.value)}
                  placeholder="Optional skip reason"
                  aria-label={`Optional skip reason for ${activity.title}`}
                  className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button type="button" variant="ghost" onClick={onSkip} className="min-h-11">
                  <SkipForward size={16} className="mr-2" /> Skip
                </Button>
              </div>
            )}
            {activity.status === "skipped" && activity.skipReason && (
              <p className="mt-3 text-xs text-muted-foreground">Skipped: {activity.skipReason}</p>
            )}
          </div>
        </div>
      </div>
      {open && <div className="border-t border-border bg-muted/20 p-4 sm:p-5">{children}</div>}
    </article>
  )
}

function ActivityMaterial({
  activity,
  plan,
  onAttempt,
  onVoiceFinished,
}: {
  activity: DailyStudyActivity
  plan: DailyStudyPlan
  onAttempt: Parameters<typeof VoicePractice>[0]["onAttempt"]
  onVoiceFinished: () => void
}) {
  if (activity.type === "review") {
    return (
      <p className="text-sm text-muted-foreground">
        Use the five review cards in the complete study kit below. Listen first, then say the Korean
        before reading it.
      </p>
    )
  }
  if (activity.type === "vocabulary") {
    return (
      <p className="text-sm text-muted-foreground">
        Study the five words and three expressions below. Tap every speaker button and create one
        sentence aloud.
      </p>
    )
  }
  if (activity.type === "shadowing") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Headphones size={18} className="text-blue-600" />
          <div>
            <p className="font-semibold">{plan.content.dialogue.title}</p>
            <p className="text-xs text-muted-foreground">
              {plan.content.dialogue.situation} · shadow each line 3×
            </p>
          </div>
        </div>
        {plan.content.dialogue.lines.map((line, index) => (
          <div key={`${line.speaker}-${index}`} className="rounded-xl bg-background p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-600">{line.speaker}</p>
                <p lang="ko" className="mt-1 break-keep font-medium [overflow-wrap:anywhere]">
                  {line.korean}
                </p>
                {plan.romanizationVisible && (
                  <p className="mt-1 break-words text-xs text-blue-600/80">{line.romanization}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">{line.english}</p>
              </div>
              <SpeakButton
                text={line.korean}
                playbackRate={0.85}
                className="min-h-10 min-w-10 shrink-0"
              />
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (activity.type === "roleplay") {
    return <VoicePractice plan={plan} onAttempt={onAttempt} onFinished={onVoiceFinished} />
  }
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Corrections to retry</p>
      {plan.attempts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Complete the voice role-play first. Your meaningful corrections will appear here.
        </p>
      ) : (
        plan.attempts.slice(-5).map((attempt) => (
          <div key={attempt.id} className="rounded-xl bg-background p-3">
            <p className="text-xs text-muted-foreground">
              Original: <span lang="ko">{attempt.feedback.originalAnswer}</span>
            </p>
            <div className="mt-2 flex items-start justify-between gap-2">
              <p lang="ko" className="break-keep text-sm font-medium [overflow-wrap:anywhere]">
                {attempt.feedback.correctedAnswer}
              </p>
              <SpeakButton
                text={attempt.feedback.correctedAnswer}
                className="min-h-10 min-w-10 shrink-0"
              />
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function StudyGroup({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={18} className="text-blue-600" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function formatSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`
}
