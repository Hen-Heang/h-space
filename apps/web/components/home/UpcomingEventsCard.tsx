"use client"

import { useMemo } from "react"
import Link from "next/link"
import { CalendarDays } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { useGoogleCalendarEvents } from "@/hooks/useGoogleCalendarEvents"
import { useGoogleCalendarIntegration } from "@/hooks/useGoogleCalendarIntegration"
import type { ExternalCalendarEvent } from "@/lib/external-calendar"
import { selectUpcomingEvents, upcomingEventsWindow } from "@/lib/home-dashboard"

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
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm dark:bg-slate-900/40 sm:p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays size={14} strokeWidth={2.5} className="text-sky-500" />
          Upcoming
        </h3>
        <Link
          href="/goals/calendar"
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
        >
          Calendar
        </Link>
      </div>

      {statusLoading || (connected && isLoading) ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : !connected ? (
        <p className="mt-3 rounded-lg border border-border bg-accent/5 px-3 py-3 text-sm text-muted-foreground">
          <Link href="/settings/integrations" className="font-medium text-primary hover:underline">
            Connect Google Calendar
          </Link>{" "}
          to see your events here.
        </p>
      ) : error ? (
        <p className="mt-3 rounded-lg border border-border bg-accent/5 px-3 py-3 text-sm text-muted-foreground">
          Calendar events couldn&apos;t be refreshed.{" "}
          <Link href="/settings/integrations" className="font-medium text-primary hover:underline">
            Check connection
          </Link>
        </p>
      ) : upcoming.length === 0 ? (
        <p className="mt-3 rounded-lg border border-border bg-accent/5 px-3 py-3 text-sm text-muted-foreground">
          Nothing scheduled for today or tomorrow.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {upcoming.map((event) => (
            <li
              key={event.id}
              className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2"
            >
              <span className="h-8 w-1 shrink-0 rounded-full bg-sky-500" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {event.title || "(No title)"}
                </p>
                <p className="text-xs text-muted-foreground">{formatWhen(event, now)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
