"use client"

import { useState } from "react"
import { Link2, Loader2, MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { ReminderButton } from "@/components/reminders/ReminderButton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface NoteActionsProps {
  pinned?: boolean
  onEdit: () => void
  onTogglePin?: () => Promise<void> | void
  onDelete: () => Promise<void> | void
  /** When provided, shows a reminder bell for this note. */
  noteId?: string
  noteSlug?: string
  noteTitle?: string
}

const iconButton = "size-11 text-muted-foreground hover:text-foreground"

/**
 * The reader's toolbar: Edit, a Pin/Unpin icon, and a More menu holding
 * "Copy link" and "Delete note" (which still asks for confirmation).
 */
export function NoteActions({
  pinned = false,
  onEdit,
  onTogglePin,
  onDelete,
  noteId,
  noteSlug,
  noteTitle,
}: NoteActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPinning, setIsPinning] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (isDeleting) return
    setIsDeleting(true)
    try {
      await onDelete()
      setShowConfirm(false)
    } catch {
      setIsDeleting(false)
    }
  }

  const handleTogglePin = async () => {
    if (!onTogglePin || isPinning) return
    setIsPinning(true)
    try {
      await onTogglePin()
    } finally {
      setIsPinning(false)
    }
  }

  const copyLink = async () => {
    if (!noteSlug) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/notes/${noteSlug}`)
      toast.success("Link copied")
    } catch {
      toast.error("Couldn't copy the link.")
    }
  }

  const pinLabel = pinned ? "Unpin note" : "Pin note"

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        className="mr-1 h-11 gap-1.5 px-3 sm:px-4"
        onClick={onEdit}
      >
        <Pencil aria-hidden="true" />
        Edit
      </Button>
      {noteId && (
        <ReminderButton
          entityType="note"
          entityId={noteId}
          deepLink={noteSlug ? `https://hengo.henheang.site/notes/${noteSlug}` : undefined}
          defaultTitle={`Revisit: ${noteTitle ?? "note"}`}
        />
      )}
      {onTogglePin && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleTogglePin}
              disabled={isPinning}
              aria-pressed={pinned}
              aria-label={pinLabel}
              className={cn(iconButton, pinned && "text-primary hover:text-primary")}
            >
              <Pin aria-hidden="true" className={pinned ? "fill-current" : undefined} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{pinLabel}</TooltipContent>
        </Tooltip>
      )}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="More actions"
                className={iconButton}
              >
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>More actions</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="min-w-48 rounded-xl">
          {noteSlug && (
            <DropdownMenuItem className="min-h-11 rounded-lg px-2.5" onSelect={copyLink}>
              <Link2 aria-hidden="true" />
              Copy link
            </DropdownMenuItem>
          )}
          {onTogglePin && (
            // Also here so the menu alone covers every action.
            <DropdownMenuItem className="min-h-11 rounded-lg px-2.5" onSelect={handleTogglePin}>
              {pinned ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />}
              {pinLabel}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            className="min-h-11 rounded-lg px-2.5"
            onSelect={() => setShowConfirm(true)}
          >
            <Trash2 aria-hidden="true" />
            Delete note
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the note. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : null}
              Delete note
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
