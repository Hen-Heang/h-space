"use client"

import Link from "next/link"
import { BrainCircuit, Plus } from "lucide-react"

import { ActiveGoalsCard } from "@/components/home/ActiveGoalsCard"
import { ContinueCard } from "@/components/home/ContinueCard"
import { LearningWidget } from "@/components/home/LearningWidget"
import { QuickAccess } from "@/components/home/QuickAccess"
import { TodayHabitCheckins } from "@/components/home/TodayHabitCheckins"
import { TodayTasksCard } from "@/components/home/TodayTasksCard"
import { UpcomingEventsCard } from "@/components/home/UpcomingEventsCard"
import { Button } from "@/components/ui/button"
import { useDailyMission } from "@/hooks/useDailyMission"
import { useStreak } from "@/hooks/useStreak"
import { askHengoItem } from "@/lib/navigation"
import { openQuickCapture } from "@/lib/quick-capture-bus"

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function getTodayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-sm font-semibold text-foreground">
      {children}
    </h2>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
//
// The private daily dashboard, in priority order: today's focus (tasks) and
// what's coming up, then personal progress (goals, habits), then where to
// pick up (recent pages, learning), then quick access to apps. Every widget
// reads an existing query cache — no dashboard-specific endpoint or table —
// and owns its own loading / empty / error state. Korean learning is one
// compact widget, not the page's centre of gravity.

export default function HomePage() {
  const { mission, loading: missionLoading, error: missionError } = useDailyMission()
  const { streakDays } = useStreak()

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{getTodayLabel()}</p>
          {/* The shell header owns the page's h1 ("Overview"). */}
          <h2 className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">
            {getGreeting()}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={openQuickCapture} className="h-9 gap-1.5 rounded-md">
            <Plus size={16} aria-hidden="true" />
            Quick capture
          </Button>
          <Button asChild variant="outline" className="h-9 gap-1.5 rounded-md">
            <Link href={askHengoItem.href}>
              <BrainCircuit size={16} aria-hidden="true" />
              {askHengoItem.label}
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-label="Today's focus" className="lg:col-span-2">
          <TodayTasksCard />
        </section>
        <section aria-label="Upcoming">
          <UpcomingEventsCard />
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section
          aria-label="Progress"
          className="grid gap-6 md:grid-cols-2 md:items-start lg:col-span-2"
        >
          <ActiveGoalsCard />
          <TodayHabitCheckins />
        </section>
        <section aria-label="Continue" className="space-y-6">
          {/* ContinueCard renders nothing until there's history. */}
          <ContinueCard />
          <LearningWidget
            mission={mission}
            loading={missionLoading}
            error={missionError}
            streakDays={streakDays}
          />
        </section>
      </div>

      <section aria-labelledby="home-quick-access" className="space-y-3">
        <SectionTitle id="home-quick-access">Quick access</SectionTitle>
        <QuickAccess />
      </section>
    </div>
  )
}
