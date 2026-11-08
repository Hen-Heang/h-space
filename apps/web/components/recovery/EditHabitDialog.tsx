"use client"

import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import type { RecoveryHabit, TrackingMode } from "@/lib/types"

export function EditHabitDialog({
  habit,
  onUpdate,
  onDelete,
}: {
  habit: RecoveryHabit
  onUpdate: (data: {
    label: string
    replacementBehavior?: string | null
    recoveryStatement?: string | null
    trackingMode?: TrackingMode
  }) => Promise<unknown>
  onDelete: () => Promise<unknown>
}) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState(habit.label)
  const [replacementBehavior, setReplacementBehavior] = useState(habit.replacementBehavior ?? "")
  const [recoveryStatement, setRecoveryStatement] = useState(habit.recoveryStatement ?? "")
  const [trackingMode, setTrackingMode] = useState<TrackingMode>(habit.trackingMode)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      setLabel(habit.label)
      setReplacementBehavior(habit.replacementBehavior ?? "")
      setRecoveryStatement(habit.recoveryStatement ?? "")
      setTrackingMode(habit.trackingMode)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim() || saving) return
    setSaving(true)
    try {
      await onUpdate({
        label: label.trim(),
        replacementBehavior: replacementBehavior.trim() || null,
        recoveryStatement: recoveryStatement.trim() || null,
        trackingMode,
      })
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Edit habit">
          <Pencil size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>Edit habit</DialogTitle>
            <DialogDescription>
              Update the private label, tracking mode, recovery statement, or replacement action.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="edit-habit-label" className="text-sm font-semibold text-foreground">
                Label
              </label>
              <Input
                id="edit-habit-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={80}
                required
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="edit-habit-replacement"
                className="text-sm font-semibold text-foreground"
              >
                Replacement behavior{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="edit-habit-replacement"
                value={replacementBehavior}
                onChange={(e) => setReplacementBehavior(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-tracking-mode" className="text-sm font-semibold text-foreground">
                Tracking mode
              </label>
              <Select
                value={trackingMode}
                onValueChange={(value) => setTrackingMode(value as TrackingMode)}
              >
                <SelectTrigger id="edit-tracking-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="abstinence">Complete abstinence</SelectItem>
                  <SelectItem value="frequency_reduction">Frequency reduction</SelectItem>
                  <SelectItem value="time_reduction">Time reduction</SelectItem>
                  <SelectItem value="personal_limit">Personal limit</SelectItem>
                  <SelectItem value="awareness">Awareness only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="edit-recovery-statement"
                className="text-sm font-semibold text-foreground"
              >
                Recovery statement
              </label>
              <Textarea
                id="edit-recovery-statement"
                value={recoveryStatement}
                onChange={(event) => setRecoveryStatement(event.target.value)}
                rows={3}
                maxLength={300}
              />
            </div>
          </div>

          <DialogFooter className="items-center sm:justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm">
                  <Trash2 size={14} />
                  Delete habit
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this habit?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes &quot;{habit.label}&quot; along with all its check-ins
                    and plans. This can&apos;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={deleting}
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button type="submit" disabled={saving || !label.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
