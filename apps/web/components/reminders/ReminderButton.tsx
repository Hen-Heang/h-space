"use client"

import { useState } from "react"
import { Bell, BellRing } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getApiErrorMessage } from "@/lib/api"
import { useReminderMutations, useReminders } from "@/hooks/useReminders"
import { describeRecurrence, type ReminderEntityType } from "@/lib/reminders"
import { ReminderDialog } from "./ReminderDialog"

export function ReminderButton({
  entityType,
  entityId,
  deepLink,
  defaultTitle,
  allowCreate = true,
}: {
  entityType: ReminderEntityType
  entityId?: string | null
  deepLink?: string | null
  defaultTitle: string
  /** False hides "Add reminder"; an existing reminder can still be paused or cancelled. */
  allowCreate?: boolean
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { reminders, loading } = useReminders({
    entityType,
    entityId: entityId ?? undefined,
    status: "active",
  })
  const { pause, cancel } = useReminderMutations()

  const active = reminders[0]

  async function run(action: () => Promise<unknown>, successMessage: string) {
    try {
      await action()
      toast.success(successMessage)
    } catch (error) {
      toast.error(getApiErrorMessage(error, "That didn't work — try again."))
    }
  }

  if (loading) return null

  if (active) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Manage reminder"
            className="text-primary"
            title={active.recurrence ? describeRecurrence(active.recurrence) : "One-time reminder"}
          >
            <BellRing size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52 rounded-xl">
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            {active.recurrence ? describeRecurrence(active.recurrence) : "One-time reminder"}
          </div>
          <DropdownMenuItem
            className="rounded-lg"
            onClick={() => run(() => pause.mutateAsync(active.id), "Reminder paused")}
          >
            Pause
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-lg text-destructive focus:text-destructive"
            onClick={() => run(() => cancel.mutateAsync(active.id), "Reminder cancelled")}
          >
            Cancel reminder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (!allowCreate) return null

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Add reminder"
        onClick={() => setDialogOpen(true)}
      >
        <Bell size={16} />
      </Button>
      <ReminderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entityType={entityType}
        entityId={entityId}
        deepLink={deepLink}
        defaultTitle={defaultTitle}
      />
    </>
  )
}
