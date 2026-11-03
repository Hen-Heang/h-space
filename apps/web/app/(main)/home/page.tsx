"use client"

import Link from "next/link"
import { ArrowUpRight, BrainCircuit, Plus } from "lucide-react"

import { ActiveGoalsCard } from "@/components/home/ActiveGoalsCard"
import { ContinueCard } from "@/components/home/ContinueCard"
import { HomeHero } from "@/components/home/HomeHero"
import { LearningWidget } from "@/components/home/LearningWidget"
import { QuickAccess } from "@/components/home/QuickAccess"
import { SnapshotMetrics } from "@/components/home/SnapshotMetrics"
import { TodayHabitCheckins } from "@/components/home/TodayHabitCheckins"
import { TodayTasksCard } from "@/components/home/TodayTasksCard"
import { UpcomingEventsCard } from "@/components/home/UpcomingEventsCard"
import { Button } from "@/components/ui/button"
import { useDailyMission } from "@/hooks/useDailyMission"
import { useProfileImage } from "@/hooks/useProfileImage"
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

/** A Home section heading: 18px, sentence case — the page's h2 level. */
function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-lg font-semibold tracking-tight text-foreground">
      {children}
    </h2>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
//
// The private daily dashboard answers "what should I focus on today?", so the
// day's work leads: today's tasks beside what's coming up, then personal
// progress (goals, habits) and where to pick up (recent pages, learning).
// The hub itself follows — the My Apps grid, a quiet snapshot strip and the
// "Your daily space" strip — kept, but below the work rather than above it.
// Every widget reads an existing query cache — no dashboard-specific endpoint
// or table — and owns its own loading / empty / error state. Korean learning
// is one compact widget, not the page's centre of gravity.

export default function HomePage() {
  const { mission, loading: missionLoading, error: missionError } = useDailyMission()
  const { streakDays } = useStreak()
  // Shares the avatar's cached profile fetch; no name yet → plain greeting.
  const { firstName } = useProfileImage()

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{getTodayLabel()}</p>
          {/* The shell header owns the page's h1 ("Overview"). */}
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {firstName ? `${getGreeting()}, ${firstName}` : getGreeting()}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A little progress every day adds up. Here is your space at a glance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={openQuickCapture} className="gap-1.5">
            <Plus size={16} aria-hidden="true" />
            Quick capture
          </Button>
          <Button asChild variant="outline" className="gap-1.5">
            <Link href={askHengoItem.href}>
              <BrainCircuit size={16} aria-hidden="true" />
              {askHengoItem.label}
            </Link>
          </Button>
        </div>
      </header>

      {/* grid-cols-1 (minmax(0, 1fr)), not the implicit auto track: an auto
          track grows to its widest unbreakable content, so one long
          single-line task title pushed the whole card off a phone screen. */}
      <section aria-labelledby="home-today" className="space-y-3">
        <SectionHeading id="home-today">Today</SectionHeading>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="min-w-0 lg:col-span-2">
            <TodayTasksCard />
          </div>
          <div className="min-w-0">
            <UpcomingEventsCard />
          </div>
        </div>
      </section>

      <section aria-labelledby="home-progress" className="space-y-3">
        <SectionHeading id="home-progress">Progress</SectionHeading>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start lg:grid-cols-3 lg:gap-6">
          <ActiveGoalsCard />
          <TodayHabitCheckins />
          <div className="min-w-0 space-y-4 md:col-span-2 lg:col-span-1 lg:space-y-6">
            {/* ContinueCard renders nothing until there's history. */}
            <ContinueCard />
            <LearningWidget
              mission={mission}
              loading={missionLoading}
              error={missionError}
              streakDays={streakDays}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="home-my-apps" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <SectionHeading id="home-my-apps">My Apps</SectionHeading>
          <Link
            href="/apps"
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            View all apps
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <QuickAccess />
      </section>

      <section aria-labelledby="home-snapshot" className="space-y-3">
        <SectionHeading id="home-snapshot">Your snapshot</SectionHeading>
        <SnapshotMetrics />
      </section>

      <HomeHero />
    </div>
  )
}
