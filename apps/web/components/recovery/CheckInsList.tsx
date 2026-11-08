"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { Pencil, Trash2 } from "lucide-react"

import { BlurFade } from "@/components/ui/blur-fade"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
import { itemVariants } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { RecoveryEvent } from "@/lib/types"

const KIND_LABEL: Record<RecoveryEvent["kind"], string> = {
  moment: "Moment",
  slip: "Slip",
  win: "Rode it out",
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function CheckInRow({
  event,
  onUpdateNote,
  onDelete,
}: {
  event: RecoveryEvent
  onUpdateNote: (note: string) => Promise<unknown>
  onDelete: () => Promise<unknown>
}) {
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(event.note ?? "")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      await onUpdateNote(note.trim())
      setEditing(false)
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
    <motion.div
      variants={itemVariants}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-semibold",
              event.kind === "slip"
                ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400"
                : "border-border bg-background text-muted-foreground",
            )}
          >
            {KIND_LABEL[event.kind]}
          </span>
          {event.emotion && (
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
              {event.emotion}
            </span>
          )}
          {typeof event.intensity === "number" && (
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
              Intensity {event.intensity}
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatWhen(event.occurredAt)}
        </span>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Note (optional)"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setNote(event.note ?? "")
                setEditing(false)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-start justify-between gap-3">
          {event.note ? (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{event.note}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No note</p>
          )}
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditing(true)}
              aria-label="Edit note"
            >
              <Pencil size={14} />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Delete check-in">
                  <Trash2 size={14} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this check-in?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes it from your history and stats. This can&apos;t be undone.
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
          </div>
        </div>
      )}
    </motion.div>
  )
}

export function CheckInsList({
  events,
  onUpdateNote,
  onDelete,
}: {
  events: RecoveryEvent[]
  onUpdateNote: (id: string, note: string) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
}) {
  if (events.length === 0) {
    return (
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm"
      >
        <p className="text-sm text-muted-foreground">No check-ins yet.</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3">
      {events.map((event, i) => (
        <BlurFade key={event.id} delay={Math.min(i * 0.05, 0.3)} inView>
          <CheckInRow
            event={event}
            onUpdateNote={(note) => onUpdateNote(event.id, note)}
            onDelete={() => onDelete(event.id)}
          />
        </BlurFade>
      ))}
    </div>
  )
}
