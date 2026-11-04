"use client"

import { useState } from "react"
import { AlertTriangle, Pause, Play, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getApiErrorMessage } from "@/lib/api"
import { useReminderMutations } from "@/hooks/useReminders"
import { describeRecurrence, REMINDER_ENTITY_LABELS, type Reminder } from "@/lib/reminders"

const SNOOZE_OPTIONS = [
  { label: "15 minutes", minutes: 15 },
  { label: "1 hour", minutes: 60 },
  { label: "Tomorrow, same time", minutes: 24 * 60 },
]

function formatDateTime(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

export function ReminderRow({ reminder }: { reminder: Reminder }) {
  const { pause, resume, cancel, snooze, remove } = useReminderMutations()
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<unknown>, successMessage: string) {
    setBusy(true)
    try {
      await action()
      toast.success(successMessage)
    } catch (error) {
      toast.error(getApiErrorMessage(error, "That didn't work — try again."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`space-y-2 py-4 ${busy ? "pointer-events-none opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{REMINDER_ENTITY_LABELS[reminder.entityType]}</Badge>
            <Badge variant="outline" className="capitalize">
              {reminder.status}
            </Badge>
          </div>
          <h4 className="mt-1.5 break-words text-base font-medium text-foreground [overflow-wrap:anywhere]">
            {reminder.title}
          </h4>
          {reminder.body && (
            <p className="mt-0.5 line-clamp-2 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
              {reminder.body}
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {reminder.recurrence ? describeRecurrence(reminder.recurrence) : "One-time"}
        {reminder.nextRunAt &&
          reminder.status === "active" &&
          ` · Next: ${formatDateTime(reminder.nextRunAt)}`}
        {reminder.lastSentAt && ` · Last sent: ${formatDateTime(reminder.lastSentAt)}`}
      </p>

      {reminder.lastError && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertTriangle size={12} />
          {reminder.lastError}
        </p>
      )}

      <div className="flex items-center justify-end gap-1.5">
        {reminder.status === "active" && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  Snooze
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44 rounded-xl">
                {SNOOZE_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.minutes}
                    className="rounded-lg"
                    onClick={() =>
                      run(
                        () => snooze.mutateAsync({ id: reminder.id, minutes: opt.minutes }),
                        `Snoozed for ${opt.label}`,
                      )
                    }
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Pause"
              onClick={() => run(() => pause.mutateAsync(reminder.id), "Paused")}
            >
              <Pause size={15} />
            </Button>
          </>
        )}
        {reminder.status === "paused" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => run(() => resume.mutateAsync(reminder.id), "Resumed")}
          >
            <Play size={13} />
            Resume
          </Button>
        )}
        {(reminder.status === "active" || reminder.status === "paused") && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Cancel"
            onClick={() => run(() => cancel.mutateAsync(reminder.id), "Cancelled")}
          >
            <X size={15} />
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete">
              <Trash2 size={15} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this reminder?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes it. This can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => run(() => remove.mutateAsync(reminder.id), "Deleted")}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
