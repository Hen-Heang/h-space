"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getApiErrorMessage, scheduleRulesApi } from "@/lib/api"
import type { GoalPlanPhase } from "@/lib/goal-plan-phases"
import type { GoalKeyResult } from "@/lib/goal-key-results"
import {
  DEFAULT_SCHEDULE_TIMEZONE,
  WEEKDAY_LABELS,
  generateOccurrences,
  rollingWindow,
  scheduleRuleInputSchema,
  type RecurrenceType,
} from "@/lib/goal-schedule-rules"
import { cn } from "@/lib/utils"

interface ScheduleRuleDialogProps {
  isOpen: boolean
  goalId: string
  phases: GoalPlanPhase[]
  keyResults: GoalKeyResult[]
  goalStartDate?: string | null
  goalTargetDate?: string | null
  todayYmd: string
  onClose: () => void
  onSaved: () => void
}

/** Create a recurring session. Shows a live preview of the next occurrences. */
export function ScheduleRuleDialog({
  isOpen,
  goalId,
  phases,
  keyResults,
  goalStartDate,
  goalTargetDate,
  todayYmd,
  onClose,
  onSaved,
}: ScheduleRuleDialogProps) {
  const [form, setForm] = useState({
    title: "",
    recurrence_type: "weekly" as RecurrenceType,
    recurrence_interval: 1,
    days_of_week: [1, 3, 5] as number[],
    day_of_month: 1,
    start_time: "07:00",
    duration_minutes: 45,
    start_date: todayYmd,
    end_date: "",
    phase_id: "",
    key_result_id: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setForm((f) => ({
      ...f,
      start_date: goalStartDate && goalStartDate > todayYmd ? goalStartDate : todayYmd,
    }))
  }, [isOpen, goalStartDate, todayYmd])

  const buildPayload = () => ({
    title: form.title,
    recurrence_type: form.recurrence_type,
    recurrence_interval: form.recurrence_interval,
    days_of_week: form.recurrence_type === "weekly" ? form.days_of_week : null,
    day_of_month: form.recurrence_type === "monthly" ? form.day_of_month : null,
    start_time: form.start_time || null,
    duration_minutes: form.duration_minutes || null,
    start_date: form.start_date,
    end_date: form.end_date || null,
    timezone: DEFAULT_SCHEDULE_TIMEZONE,
    active: true,
    phase_id: form.phase_id || null,
    key_result_id: form.key_result_id || null,
  })

  const parsed = scheduleRuleInputSchema.safeParse(buildPayload())
  const preview = parsed.success
    ? generateOccurrences(parsed.data, rollingWindow(todayYmd), {
        goalStartDate,
        goalTargetDate,
      })
    : []

  const save = async () => {
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the routine details.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await scheduleRulesApi.create({ goal_id: goalId, ...parsed.data })
      onSaved()
      onClose()
      toast.success("Routine created", {
        description: "Use “Create next 14 days” to put it on the calendar.",
      })
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't save this routine. Please try again."))
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = (day: number) =>
    setForm((f) => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? f.days_of_week.filter((d) => d !== day)
        : [...f.days_of_week, day].sort((a, b) => a - b),
    }))

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-[520px] flex-col gap-0 overflow-hidden rounded-2xl p-0">
        <div className="border-b border-border/60 px-5 py-4">
          <DialogTitle className="text-base font-semibold">New recurring session</DialogTitle>
          <DialogDescription className="mt-1 text-xs">
            A repeating commitment. Tasks are only created when you ask for them.
          </DialogDescription>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="rule-title">Name</Label>
            <Input
              id="rule-title"
              autoFocus
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Morning speaking drill"
              className="h-11 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rule-type">Repeats</Label>
              <select
                id="rule-type"
                value={form.recurrence_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, recurrence_type: e.target.value as RecurrenceType }))
                }
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none focus:border-primary/40"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rule-interval">Every</Label>
              <Input
                id="rule-interval"
                type="number"
                min={1}
                max={52}
                value={form.recurrence_interval}
                onChange={(e) =>
                  setForm((f) => ({ ...f, recurrence_interval: Number(e.target.value) || 1 }))
                }
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          {form.recurrence_type === "weekly" && (
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Days</legend>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_LABELS.map((label, day) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleDay(day)}
                    aria-pressed={form.days_of_week.includes(day)}
                    className={cn(
                      "h-11 min-w-11 rounded-xl border px-2 text-xs font-semibold transition-colors",
                      form.days_of_week.includes(day)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {form.recurrence_type === "monthly" && (
            <div className="space-y-1.5">
              <Label htmlFor="rule-dom">Day of month</Label>
              <Input
                id="rule-dom"
                type="number"
                min={1}
                max={31}
                value={form.day_of_month}
                onChange={(e) =>
                  setForm((f) => ({ ...f, day_of_month: Number(e.target.value) || 1 }))
                }
                className="h-11 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Months without this day are skipped, never moved to another day.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rule-time">Start time</Label>
              <Input
                id="rule-time"
                type="time"
                value={form.start_time}
                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rule-duration">Minutes</Label>
              <Input
                id="rule-duration"
                type="number"
                min={5}
                max={1440}
                value={form.duration_minutes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) || 0 }))
                }
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rule-start">Starts</Label>
              <Input
                id="rule-start"
                type="date"
                value={form.start_date}
                min={goalStartDate ?? undefined}
                max={goalTargetDate ?? undefined}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rule-end">Ends (optional)</Label>
              <Input
                id="rule-end"
                type="date"
                value={form.end_date}
                min={form.start_date}
                max={goalTargetDate ?? undefined}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          {(phases.length > 0 || keyResults.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rule-phase">Phase</Label>
                <select
                  id="rule-phase"
                  value={form.phase_id}
                  onChange={(e) => setForm((f) => ({ ...f, phase_id: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none focus:border-primary/40"
                >
                  <option value="">None</option>
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rule-kr">Key result</Label>
                <select
                  id="rule-kr"
                  value={form.key_result_id}
                  onChange={(e) => setForm((f) => ({ ...f, key_result_id: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none focus:border-primary/40"
                >
                  <option value="">None</option>
                  {keyResults
                    .filter((kr) => kr.status === "active")
                    .map((kr) => (
                      <option key={kr.id} value={kr.id}>
                        {kr.title}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Next 14 days
            </p>
            <p className="mt-1 text-xs font-medium text-foreground">
              {preview.length === 0
                ? "No sessions in the next two weeks with these settings."
                : `${preview.length} session${preview.length === 1 ? "" : "s"} · ${preview.slice(0, 5).join(", ")}${preview.length > 5 ? "…" : ""}`}
            </p>
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 border-t border-border/60 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="outline" onClick={onClose} className="h-11 flex-1 rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={() => void save()}
            disabled={saving || !form.title.trim()}
            className="h-11 flex-[2] rounded-xl"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create routine
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
