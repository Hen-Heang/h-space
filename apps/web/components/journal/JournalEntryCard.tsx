"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
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
import { getApiErrorMessage } from "@/lib/api"
import { useJournalMutations } from "@/hooks/useJournal"
import { ENERGY_LABELS, MOOD_LABELS, type JournalEntry } from "@/lib/journal"
import { entryToComposerValues, JournalComposer } from "./JournalComposer"

export function JournalEntryCard({ entry }: { entry: JournalEntry }) {
  const { update, remove } = useJournalMutations()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const occurredLabel = new Date(entry.occurredAt).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })

  async function handleDelete() {
    setDeleting(true)
    try {
      await remove.mutateAsync(entry.id)
      toast.success("Entry deleted")
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't delete that entry."))
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <JournalComposer
        mode="edit"
        initial={entryToComposerValues(entry)}
        onCancel={() => setEditing(false)}
        onSave={async (input) => {
          await update.mutateAsync({ id: entry.id, input })
          toast.success("Entry updated")
          setEditing(false)
        }}
      />
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{occurredLabel}</p>
          {entry.title && (
            <h3 className="mt-0.5 text-sm font-semibold text-foreground">{entry.title}</h3>
          )}
        </div>
        <div className="flex items-center gap-1">
          {entry.mood != null && <Badge variant="outline">Mood: {MOOD_LABELS[entry.mood]}</Badge>}
          {entry.energy != null && (
            <Badge variant="outline">Energy: {ENERGY_LABELS[entry.energy]}</Badge>
          )}
        </div>
      </div>

      {entry.achievement && (
        <p className="text-sm text-foreground">
          <span className="font-medium text-muted-foreground">Did: </span>
          {entry.achievement}
        </p>
      )}
      {entry.lesson && (
        <p className="text-sm text-foreground">
          <span className="font-medium text-muted-foreground">Learned: </span>
          {entry.lesson}
        </p>
      )}
      {entry.blocker && (
        <p className="text-sm text-foreground">
          <span className="font-medium text-muted-foreground">Difficult: </span>
          {entry.blocker}
        </p>
      )}
      {entry.gratitude && (
        <p className="text-sm text-foreground">
          <span className="font-medium text-muted-foreground">Grateful for: </span>
          {entry.gratitude}
        </p>
      )}
      {entry.content && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {entry.content}
        </p>
      )}

      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete entry">
              <Trash2 size={16} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the journal entry. This can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                onClick={handleDelete}
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
