"use client"

import dynamic from "next/dynamic"

import { GoalsHubNav } from "@/components/goals/hub/GoalsHubNav"

// The calendar is heavy (date-grid + recharts-free but large). Load it on the
// client after first paint so the page shell appears immediately.
const Calendar = dynamic(() => import("@/components/calendar/Calendar").then((m) => m.Calendar), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted/20" />,
})

// Standalone all-task calendar. The same component is embedded in a goal's
// schedule, while this primary route opts into the full workspace treatment:
// the Planner's tabs on top, the calendar owning every remaining pixel.
export default function CalendarPage() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="shrink-0 px-4 pt-3 sm:px-6 lg:px-8">
        <GoalsHubNav />
      </div>
      <div className="min-h-0 flex-1">
        <Calendar fullBleed />
      </div>
    </div>
  )
}
