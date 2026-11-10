"use client"

import Link from "next/link"
import { ArrowUpRight, Plus } from "lucide-react"

import { ActiveGoalsCard } from "@/components/home/ActiveGoalsCard"
import { ContinueCard } from "@/components/home/ContinueCard"
import { HOME_LINK } from "@/components/home/home-primitives"
import { LearningWidget } from "@/components/home/LearningWidget"
import { QuickAccess } from "@/components/home/QuickAccess"
import { TodayHabitCheckins } from "@/components/home/TodayHabitCheckins"
import { TodayTasksCard } from "@/components/home/TodayTasksCard"
import { Button } from "@/components/ui/button"
import { PageSection } from "@/components/ui/page-section"
import { useDailyMission } from "@/hooks/useDailyMission"
import { useProfileImage } from "@/hooks/useProfileImage"
import { useStreak } from "@/hooks/useStreak"
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

// ─── Page ──────────────────────────────────────────────────────────────────────
//
// Home leads with the day's work, then compact progress, a few app shortcuts,
// and recent destinations. Widgets read existing query caches; there is no
// dashboard-specific endpoint or table.

export default function HomePage() {
  const { mission, loading: missionLoading, error: missionError } = useDailyMission()
  const { streakDays } = useStreak()
  // Shares the avatar's cached profile fetch; no name yet → plain greeting.
  const { firstName } = useProfileImage()

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{getTodayLabel()}</p>
          {/* The shell header owns the page's h1 ("Overview"). */}
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {firstName ? `${getGreeting()}, ${firstName}` : getGreeting()}
          </h2>
        </div>
        {/* Home's own actions. Ask Hengo lives in the top bar, not here; this
            row is kept for creation shortcuts. */}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={openQuickCapture} className="gap-1.5">
            <Plus size={16} aria-hidden="true" />
            Quick capture
          </Button>
        </div>
      </header>

      <PageSection
        title="Today"
        action={
          <Link href="/goals/tasks" className={HOME_LINK}>
            All tasks
          </Link>
        }
      >
        <TodayTasksCard />
      </PageSection>

      <PageSection title="Progress">
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
          <ActiveGoalsCard />
          <TodayHabitCheckins />
          <div className="min-w-0 border-t border-border pt-4 md:col-span-2">
            <LearningWidget
              mission={mission}
              loading={missionLoading}
              error={missionError}
              streakDays={streakDays}
            />
          </div>
        </div>
      </PageSection>

      <PageSection
        title="My Apps"
        action={
          <Link href="/apps" className={HOME_LINK}>
            Browse apps
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        }
      >
        <QuickAccess />
      </PageSection>

      {/* Last on purpose: it reads localStorage, so it can only appear after
          hydration. At the bottom it never pushes other content down. */}
      <ContinueCard />
    </div>
  )
}
