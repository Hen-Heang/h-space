"use client"

import { BarChart3, Clock3, Moon, TrendingDown, Waves } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  averageTimeToReturnHours,
  averageUrgeIntensity,
  copingEffectiveness,
  frequencyReductionPercent,
  highestRiskTimeRange,
  weeklyUrgeTrend,
} from "@/lib/recovery"
import type { RecoveryEvent, RecoveryHabit, RecoveryTrigger } from "@/lib/types"

function hourInKst(iso: string): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date(iso)),
  )
}
function hourLabel(hour: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(new Date(2026, 0, 1, hour))
}
function percentWidth(value: number, max: number): string {
  return `${max <= 0 ? 0 : Math.max(4, (value / max) * 100)}%`
}

export function RecoveryInsights({
  target,
  events,
  triggers,
}: {
  target: RecoveryHabit
  events: RecoveryEvent[]
  triggers: RecoveryTrigger[]
}) {
  const averageIntensity = averageUrgeIntensity(events, target.id)
  const riskWindow = highestRiskTimeRange(events, "Asia/Seoul", target.id)
  const averageReturn = averageTimeToReturnHours(events, target.id)
  const trend = weeklyUrgeTrend(events, new Date(), target.id)
  const effectiveness = copingEffectiveness(events, target.id).slice(0, 6)
  const triggerCounts = triggers
    .map((trigger) => ({
      label: trigger.label,
      count: events.filter((event) => event.triggerId === trigger.id).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
  const hourCounts = Array.from({ length: 12 }, (_, index) => ({
    start: index * 2,
    count: events.filter((event) => Math.floor(hourInKst(event.occurredAt) / 2) * 2 === index * 2)
      .length,
  }))
  const emotionCounts = [
    ...new Set(
      events.map((event) => event.emotion).filter((item): item is string => Boolean(item)),
    ),
  ]
    .map((emotion) => ({
      label: emotion,
      count: events.filter((event) => event.emotion === emotion).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
  const deviceCounts = [
    ...new Set(events.map((event) => event.device).filter((item): item is string => Boolean(item))),
  ]
    .map((device) => ({
      label: device,
      count: events.filter((event) => event.device === device).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
  const sleepGroups = [1, 2, 3, 4, 5]
    .map((quality) => {
      const values = events
        .filter((event) => event.sleepQuality === quality && typeof event.intensity === "number")
        .map((event) => event.intensity as number)
      return {
        label: `${quality}/5 sleep`,
        count: values.length,
        average: values.length
          ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
          : 0,
      }
    })
    .filter((item) => item.count > 0)
  const baseline = target.baseline?.approximateFrequency
  const baselineWeekly =
    baseline == null
      ? null
      : target.baseline?.frequencyPeriod === "day"
        ? baseline * 7
        : target.baseline?.frequencyPeriod === "month"
          ? baseline / 4.345
          : baseline
  const reduction =
    baselineWeekly == null
      ? null
      : frequencyReductionPercent(baselineWeekly, events, 28, new Date(), target.id)

  if (events.length === 0)
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
        <BarChart3 className="mx-auto text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Your Trigger Map will grow here</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Complete a check-in or Urge Rescue session. Optional fields can be skipped and insights
          still work with what you choose to record.
        </p>
      </div>
    )

  const cards = [
    {
      label: "Average urge",
      value: averageIntensity == null ? "—" : `${averageIntensity}/10`,
      icon: Waves,
    },
    {
      label: "Highest-risk window",
      value: riskWindow
        ? `${hourLabel(riskWindow.startHour)}–${hourLabel(riskWindow.endHour)}`
        : "—",
      icon: Clock3,
    },
    {
      label: "Average return time",
      value: averageReturn == null ? "—" : `${averageReturn}h`,
      icon: TrendingDown,
    },
    {
      label: "7-day intensity trend",
      value: trend === "improving" ? "Lower" : trend === "higher" ? "Higher" : "Steady",
      icon: BarChart3,
    },
  ]
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} size="sm">
            <CardContent>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xl font-semibold">{value}</p>
                  <p className="mt-1 text-xs leading-4 text-muted-foreground">{label}</p>
                </div>
                <Icon size={16} className="text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {reduction != null && (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm">
          <p className="font-semibold">
            Frequency change:{" "}
            {reduction > 0
              ? `${reduction}% below baseline`
              : reduction < 0
                ? `${Math.abs(reduction)}% above baseline`
                : "at baseline"}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Compared with the optional baseline you entered. Missing days are not counted as
            success.
          </p>
        </div>
      )}
      {riskWindow && (
        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm leading-6">
          <strong>Pattern:</strong> your most recorded two-hour window is{" "}
          {hourLabel(riskWindow.startHour)}–{hourLabel(riskWindow.endHour)}. This is a pattern in
          your records, not a medical conclusion and not proof of cause.
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <SimpleBarChart
          title="High-risk hours"
          description="Events by two-hour window"
          rows={hourCounts.map((item) => ({
            label: `${hourLabel(item.start)}–${hourLabel((item.start + 2) % 24)}`,
            value: item.count,
          }))}
        />
        <SimpleBarChart
          title="Most common triggers"
          description="Only tags you chose to save"
          rows={triggerCounts.map((item) => ({ label: item.label, value: item.count }))}
          empty="No trigger tags recorded yet."
        />
        <SimpleBarChart
          title="Mood patterns"
          description="Recorded feelings, not diagnoses"
          rows={emotionCounts.map((item) => ({ label: item.label, value: item.count }))}
          empty="No feelings recorded yet."
        />
        <SimpleBarChart
          title="Device patterns"
          description="No sites or search terms are stored"
          rows={deviceCounts.map((item) => ({ label: item.label, value: item.count }))}
          empty="No device context recorded yet."
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coping effectiveness</CardTitle>
            <p className="text-xs text-muted-foreground">
              Successful outcomes divided by recorded attempts.
            </p>
          </CardHeader>
          <CardContent>
            {effectiveness.length ? (
              <div className="space-y-4">
                {effectiveness.map((item) => (
                  <div key={item.action}>
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="truncate">{item.action}</span>
                      <span className="font-mono text-muted-foreground">
                        {item.successRate}% · {item.attempts}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${item.successRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Complete a replacement action in Rescue Mode to compare what works.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Moon size={16} className="text-primary" />
              Sleep correlation
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Average urge intensity at each recorded sleep rating.
            </p>
          </CardHeader>
          <CardContent>
            {sleepGroups.length ? (
              <div className="space-y-4">
                {sleepGroups.map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between gap-3 text-xs">
                      <span>{item.label}</span>
                      <span className="font-mono text-muted-foreground">
                        {item.average}/10 · {item.count}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${item.average * 10}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No events include both sleep quality and urge intensity yet.
              </p>
            )}
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Correlation can suggest an experiment; it does not prove that sleep caused an urge.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SimpleBarChart({
  title,
  description,
  rows,
  empty,
}: {
  title: string
  description: string
  rows: Array<{ label: string; value: number }>
  empty?: string
}) {
  const visible = rows.filter((row) => row.value > 0)
  const max = Math.max(0, ...visible.map((row) => row.value))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {visible.length ? (
          <div
            className="space-y-3"
            role="img"
            aria-label={`${title}. ${visible.map((row) => `${row.label}: ${row.value}`).join(", ")}`}
          >
            {visible.map((row) => (
              <div key={row.label} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-2">
                <span className="truncate text-xs text-muted-foreground">{row.label}</span>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: percentWidth(row.value, max) }}
                  />
                </div>
                <span className="text-right font-mono text-xs">{row.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{empty ?? "No records yet."}</p>
        )}
      </CardContent>
    </Card>
  )
}
