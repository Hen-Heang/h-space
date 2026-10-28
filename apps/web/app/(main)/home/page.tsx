"use client"

import Link from "next/link"
import { ArrowUpRight, BrainCircuit, Plus, Sparkles } from "lucide-react"

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

function Eyebrow({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
    >
      {children}
    </h2>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
//
// The private daily dashboard, laid out after the Figma "H-Space • Desktop
// dashboard" frame: greeting, the My Apps banner, a snapshot row, the app
// grid, then today's focus (tasks) beside what's coming up, personal progress
// (goals, habits), and where to pick up (recent pages, learning). Every widget
// reads an existing query cache — no dashboard-specific endpoint or table —
// and owns its own loading / empty / error state. Korean learning is one
// compact widget, not the page's centre of gravity.

export default function HomePage() {
  const { mission, loading: missionLoading, error: missionError } = useDailyMission()
  const { streakDays } = useStreak()
  // Shares the avatar's cached profile fetch; no name yet → plain greeting.
  const { firstName } = useProfileImage()

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{getTodayLabel()}</p>
          {/* The shell header owns the page's h1 ("Overview"). */}
          <h2 className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
            {firstName ? `${getGreeting()}, ${firstName}` : getGreeting()}
            <Sparkles size={22} className="text-primary" aria-hidden="true" />
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            A little progress every day adds up. Here is your space at a glance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={openQuickCapture} className="h-10 gap-1.5 rounded-xl px-4">
            <Plus size={16} aria-hidden="true" />
            Quick capture
          </Button>
          <Button asChild variant="outline" className="h-10 gap-1.5 rounded-xl bg-card px-4">
            <Link href={askHengoItem.href}>
              <BrainCircuit size={16} aria-hidden="true" />
              {askHengoItem.label}
            </Link>
          </Button>
        </div>
      </header>

      <HomeHero />

      <section aria-labelledby="home-snapshot" className="space-y-3">
        <Eyebrow id="home-snapshot">Your snapshot</Eyebrow>
        <SnapshotMetrics />
      </section>

      <section aria-labelledby="home-my-apps" className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="home-my-apps" className="text-xl font-bold tracking-tight text-foreground">
              My Apps
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Your favorite tools, just one click away.
            </p>
          </div>
          <Link
            href="/apps"
            className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring"
          >
            View all apps
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <QuickAccess />
      </section>

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
    </div>
  )
}
