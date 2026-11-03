"use client"

import { useMemo } from "react"
import Link from "next/link"
import { CalendarDays } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { useGoogleCalendarEvents } from "@/hooks/useGoogleCalendarEvents"
import { useGoogleCalendarIntegration } from "@/hooks/useGoogleCalendarIntegration"
import type { ExternalCalendarEvent } from "@/lib/external-calendar"
import { selectUpcomingEvents, upcomingEventsWindow } from "@/lib/home-dashboard"

import { DASHBOARD_ROW, DASHBOARD_ROWS, DashboardCard, DashboardNote } from "./dashboard-card"

function formatWhen(event: ExternalCalendarEvent, now: Date): string {
  const start = new Date(event.start)
  const isToday = start.toDateString() === now.toDateString()
  const day = isToday ? "Today" : start.toLocaleDateString(undefined, { weekday: "short" })
  if (event.allDay) return `${day} · All day`
  return `${day} · ${start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
}

/**
 * Read-only Google Calendar events for today and tomorrow. Only queries when
 * the integration is connected; otherwise shows a single connect link. Like
 * the Planner, an expired grant degrades to "no events", never a broken card.
 */
export function UpcomingEventsCard() {
  const { connected, isLoading: statusLoading } = useGoogleCalendarIntegration()
  // Fixed per mount so the query key stays stable across renders.
  const { now, window } = useMemo(() => {
    const at = new Date()
    return { now: at, window: upcomingEventsWindow(at) }
  }, [])
  const { events, error, isLoading } = useGoogleCalendarEvents({
    enabled: connected,
    ...window,
  })
  const upcoming = selectUpcomingEvents(events, now)

  return (
    <DashboardCard
      title="Upcoming"
      icon={CalendarDays}
      action={{ href: "/goals/calendar", label: "Calendar" }}
    >
      {statusLoading || (connected && isLoading) ? (
        <div className="space-y-2 py-1">
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      ) : !connected ? (
        <DashboardNote>
          <Link href="/settings/integrations" className="font-medium text-primary hover:underline">
            Connect Google Calendar
          </Link>{" "}
          to see your events here.
        </DashboardNote>
      ) : error ? (
        <DashboardNote>
          Calendar events couldn&apos;t be refreshed.{" "}
          <Link href="/settings/integrations" className="font-medium text-primary hover:underline">
            Check connection
          </Link>
        </DashboardNote>
      ) : upcoming.length === 0 ? (
        <DashboardNote>Nothing scheduled for today or tomorrow.</DashboardNote>
      ) : (
        <ul className={DASHBOARD_ROWS}>
          {upcoming.map((event) => (
            <li key={event.id} className={DASHBOARD_ROW}>
              <span className="h-8 w-1 shrink-0 rounded-full bg-primary/40" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 break-words text-base text-foreground">
                  {event.title || "(No title)"}
                </p>
                <p className="text-sm text-muted-foreground">{formatWhen(event, now)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}
