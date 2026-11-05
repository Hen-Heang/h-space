"use client"

import { useEffect, useMemo, useState } from "react"
import { Bell, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getApiErrorMessage, previewNextRun } from "@/lib/api"
import { usePush } from "@/hooks/usePush"
import { useReminderMutations } from "@/hooks/useReminders"
import {
  getDeviceTimeZone,
  validateReminderInput,
  WEEKDAY_LABELS,
  type ReminderChannel,
  type ReminderEntityType,
  type ReminderFrequency,
} from "@/lib/reminders"
import { cn } from "@/lib/utils"

export interface ReminderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: ReminderEntityType
  entityId?: string | null
  deepLink?: string | null
  defaultTitle: string
}

type ScheduleMode = "once" | "recurring"

/** A native datetime-local input can hand back a partial/incomplete string
 * while the user is still typing a segment — never let that reach
 * `new Date(...).toISOString()`, which throws on an Invalid Date. */
function parseValidDate(value: string): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function ReminderDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  deepLink,
  defaultTitle,
}: ReminderDialogProps) {
  const [title, setTitle] = useState(defaultTitle)
  const [body, setBody] = useState("")
  const [mode, setMode] = useState<ScheduleMode>("recurring")
  const [scheduledFor, setScheduledFor] = useState("")
  const [frequency, setFrequency] = useState<ReminderFrequency>("daily")
  const [time, setTime] = useState("09:00")
  const [anchorWeekday, setAnchorWeekday] = useState(1)
  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 5])
  const [channels, setChannels] = useState<ReminderChannel[]>(["web", "telegram"])
  const [preview, setPreview] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const { create } = useReminderMutations()
  const push = usePush()
  // Read once per mount. The dialog only renders client-side once opened, so
  // the server's own zone never reaches the markup.
  const timeZone = useMemo(() => getDeviceTimeZone(), [])

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle)
      setSubmitAttempted(false)
    }
  }, [open, defaultTitle])

  const recurrence = useMemo(
    () =>
      mode === "recurring"
        ? frequency === "weekly"
          ? { frequency, time, anchorWeekday }
          : frequency === "weekdays"
            ? { frequency, time, weekdays }
            : { frequency, time }
        : null,
    [anchorWeekday, frequency, mode, time, weekdays],
  )

  const parsedScheduledFor = useMemo(
    () => (mode === "once" ? parseValidDate(scheduledFor) : null),
    [mode, scheduledFor],
  )

  const input = {
    title,
    scheduledFor: parsedScheduledFor ? parsedScheduledFor.toISOString() : null,
    recurrence,
    channels,
  }
  const errors = validateReminderInput(input)

  useEffect(() => {
    let cancelled = false
    if (mode === "recurring" && recurrence && !errors.schedule) {
      previewNextRun(recurrence, timeZone)
        .then((date) => {
          if (!cancelled)
            setPreview(
              date
                ? date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                : "",
            )
        })
        .catch(() => {
          if (!cancelled) setPreview("")
        })
    } else if (mode === "once" && parsedScheduledFor) {
      setPreview(
        parsedScheduledFor.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
      )
    } else {
      setPreview("")
    }
    return () => {
      cancelled = true
    }
  }, [errors.schedule, mode, parsedScheduledFor, recurrence, timeZone])

  function toggleChannel(channel: ReminderChannel) {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel],
    )
  }

  function toggleWeekday(day: number) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    )
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitAttempted(true)
    if (Object.keys(errors).length > 0 || saving) return
    setSaving(true)
    try {
      await create.mutateAsync({
        title: title.trim(),
        body: body.trim() || null,
        entityType,
        entityId: entityId ?? null,
        scheduledFor: input.scheduledFor,
        recurrence,
        timezone: timeZone,
        channels,
        deepLink: deepLink ?? null,
      })
      toast.success("Reminder scheduled")
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't create that reminder."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell size={16} />
              New reminder
            </DialogTitle>
            <DialogDescription>Timezone: {timeZone}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Reminder title"
              maxLength={200}
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Message (optional)"
              className="min-h-16"
            />

            <div
              className="flex items-center gap-1 rounded-xl border border-border bg-card p-1"
              role="group"
              aria-label="Schedule type"
            >
              <button
                type="button"
                onClick={() => setMode("recurring")}
                aria-pressed={mode === "recurring"}
                className={cn(
                  "min-h-11 flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  mode === "recurring" ? "bg-accent text-foreground" : "text-muted-foreground",
                )}
              >
                Recurring
              </button>
              <button
                type="button"
                onClick={() => setMode("once")}
                aria-pressed={mode === "once"}
                className={cn(
                  "min-h-11 flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  mode === "once" ? "bg-accent text-foreground" : "text-muted-foreground",
                )}
              >
                One-time
              </button>
            </div>

            {mode === "once" ? (
              <Input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                aria-label="Date and time"
              />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Select
                    value={frequency}
                    onValueChange={(v) => setFrequency(v as ReminderFrequency)}
                  >
                    <SelectTrigger className="flex-1" aria-label="Repeat frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="weekdays">Selected weekdays</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-32"
                    aria-label="Time"
                  />
                </div>

                {frequency === "weekly" && (
                  <div
                    className="flex flex-wrap gap-1.5"
                    role="group"
                    aria-label="Weekly reminder day"
                  >
                    {WEEKDAY_LABELS.map((label, index) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setAnchorWeekday(index)}
                        aria-pressed={anchorWeekday === index}
                        className={cn(
                          "min-h-11 min-w-11 rounded-lg border px-2.5 py-2 text-sm font-medium transition-colors",
                          anchorWeekday === index
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {frequency === "weekdays" && (
                  <div
                    className="flex flex-wrap gap-1.5"
                    role="group"
                    aria-label="Reminder weekdays"
                  >
                    {WEEKDAY_LABELS.map((label, index) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleWeekday(index)}
                        aria-pressed={weekdays.includes(index)}
                        className={cn(
                          "min-h-11 min-w-11 rounded-lg border px-2.5 py-2 text-sm font-medium transition-colors",
                          weekdays.includes(index)
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {preview && (
              <p className="text-sm text-muted-foreground">Next scheduled run: {preview}</p>
            )}
            {submitAttempted && errors.schedule && (
              <p role="alert" className="text-sm text-destructive">
                {errors.schedule}
              </p>
            )}

            <div className="space-y-1.5">
              <span className="text-sm font-medium text-muted-foreground">Deliver via</span>
              <div className="flex gap-2" role="group" aria-label="Delivery channels">
                <button
                  type="button"
                  onClick={() => toggleChannel("web")}
                  aria-pressed={channels.includes("web")}
                  className={cn(
                    "min-h-11 flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    channels.includes("web")
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  Browser {!push.webEnabled && "(not enabled)"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleChannel("telegram")}
                  aria-pressed={channels.includes("telegram")}
                  className={cn(
                    "min-h-11 flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    channels.includes("telegram")
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  Telegram {!push.telegramLinked && "(not linked)"}
                </button>
              </div>
              {submitAttempted && errors.channels && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.channels}
                </p>
              )}
              {(!push.webEnabled || !push.telegramLinked) && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Connect delivery channels in Settings → Notifications for reminders to actually
                  reach you.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Set reminder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
