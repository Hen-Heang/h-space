"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { GrowthTabs } from "@/components/growth/GrowthTabs"
import { TodayHabitCheckins } from "@/components/home/TodayHabitCheckins"
import { navItem } from "@/lib/navigation"

// The Growth workspace's landing page. It adds no data of its own: today's
// habit check-ins reuse the Home widget (same query cache), and every other
// Growth feature keeps its own route — this page is only the front door.
const AREAS = [
  navItem("growth-habits"),
  navItem("growth-journal"),
  navItem("grow-progress"),
  navItem("review-hub"),
  navItem("growth-recovery"),
]

const AREA_COPY: Record<string, string> = {
  "growth-habits": "Daily check-offs for the few habits you want to keep.",
  "growth-recovery": "Pause, plan, and check in when a moment gets hard.",
}

export default function GrowthPage() {
  return (
    <div className="space-y-6 pb-12">
      <div>
        <GrowthTabs />
        <p className="text-sm text-muted-foreground">
          Habits, reflection, and progress — the slower loops behind the daily work.
        </p>
      </div>

      {/* Carries its own "Today's habits" heading. */}
      <TodayHabitCheckins />

      <section aria-labelledby="growth-areas" className="space-y-3">
        <h2 id="growth-areas" className="text-sm font-semibold text-foreground">
          Areas
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AREAS.map((area) => {
            const Icon = area.icon
            return (
              <li key={area.id}>
                <Link
                  href={area.href}
                  className="group flex h-full items-start gap-3 rounded-lg border border-border bg-card p-4 outline-none transition-colors hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">
                      {area.label}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {AREA_COPY[area.id] ?? area.description}
                    </span>
                  </span>
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
