"use client"

import { useState } from "react"
import {
  Archive,
  ArchiveRestore,
  ListChecks,
  MoreHorizontal,
  NotebookPen,
  Pin,
  PinOff,
  Sparkles,
  Trash2,
} from "lucide-react"
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
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ReminderButton } from "@/components/reminders/ReminderButton"
import { isSpringInboxEnabled } from "@/lib/feature-flags"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getApiErrorMessage } from "@/lib/api"
import { useInboxMutations } from "@/hooks/useInbox"
import type { InboxItem } from "@/lib/inbox"
import { cn } from "@/lib/utils"

const TYPE_LABEL: Record<InboxItem["itemType"], string> = {
  idea: "Idea",
  note: "Note",
  task: "Task",
  activity: "Activity",
  phrase: "Korean phrase",
  dev: "Dev learning",
  journal: "Journal thought",
}

const CONVERTED_LABEL: Record<NonNullable<InboxItem["convertedToType"]>, string> = {
  note: "Note",
  task: "Task",
  journal: "Journal",
}

function todayYmd(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

/**
 * One captured item as a divider row (the page puts the rows on one surface).
 * The content leads; type, time, status and tags share one quiet metadata
 * line instead of a row of badges. Only "Convert" (the inbox's job) and the
 * reminder bell stay visible — pin, archive and delete live in the ⋯ menu.
 */
export function InboxItemCard({ item }: { item: InboxItem }) {
  const { togglePinned, archive, restore, remove, convertToNote, convertToTask, convertToJournal } =
    useInboxMutations()
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

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

  const capturedLabel = new Date(item.capturedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
  const name = item.title?.trim() || item.content.slice(0, 40)
  const isArchived = item.status === "archived"

  return (
    <li
      className={cn(
        "py-3 transition-opacity",
        item.status !== "inbox" && "opacity-70",
        busy && "pointer-events-none opacity-60",
      )}
    >
      {item.title && (
        <h3 className="break-words text-base font-medium text-foreground [overflow-wrap:anywhere]">
          {item.title}
        </h3>
      )}
      <p
        className={cn(
          "whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]",
          item.title ? "mt-0.5 text-muted-foreground" : "text-foreground",
        )}
      >
        {item.content}
      </p>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {item.pinned && (
            <span className="inline-flex items-center gap-1 text-primary">
              <Pin size={12} className="fill-current" aria-hidden="true" />
              Pinned
            </span>
          )}
          <span>{TYPE_LABEL[item.itemType]}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={item.capturedAt}>{capturedLabel}</time>
          {item.status !== "inbox" && (
            <>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{item.status}</span>
            </>
          )}
          {item.convertedToType && (
            <>
              <span aria-hidden="true">·</span>
              <span>→ {CONVERTED_LABEL[item.convertedToType]}</span>
            </>
          )}
          {item.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </p>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {item.status === "inbox" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  Convert
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48 rounded-xl">
                <DropdownMenuItem
                  className="rounded-lg"
                  onClick={() => run(() => convertToNote.mutateAsync(item), "Converted to a note")}
                >
                  <NotebookPen size={14} aria-hidden="true" /> Convert to note
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-lg"
                  onClick={() =>
                    run(
                      () => convertToTask.mutateAsync({ item, date: todayYmd() }),
                      "Added as today's task",
                    )
                  }
                >
                  <ListChecks size={14} aria-hidden="true" /> Convert to task (today)
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-lg"
                  onClick={() =>
                    run(() => convertToJournal.mutateAsync(item), "Added to your journal")
                  }
                >
                  <Sparkles size={14} aria-hidden="true" /> Convert to journal entry
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <ReminderButton
            entityType="inbox_item"
            entityId={item.id}
            deepLink="https://hengo.henheang.site/inbox"
            defaultTitle={item.title?.trim() || item.content.slice(0, 60)}
            // Reminders can't follow an item that lives only in hspace-api yet
            // (see remindersApi.create).
            allowCreate={!isSpringInboxEnabled()}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`More actions for "${name}"`}
              >
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44 rounded-xl">
              <DropdownMenuItem
                className="rounded-lg"
                onClick={() =>
                  run(
                    () => togglePinned.mutateAsync({ id: item.id, pinned: !item.pinned }),
                    item.pinned ? "Unpinned" : "Pinned",
                  )
                }
              >
                {item.pinned ? (
                  <PinOff size={14} aria-hidden="true" />
                ) : (
                  <Pin size={14} aria-hidden="true" />
                )}
                {item.pinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-lg"
                onClick={() =>
                  run(
                    () =>
                      isArchived ? restore.mutateAsync(item.id) : archive.mutateAsync(item.id),
                    isArchived ? "Restored to inbox" : "Archived",
                  )
                }
              >
                {isArchived ? (
                  <ArchiveRestore size={14} aria-hidden="true" />
                ) : (
                  <Archive size={14} aria-hidden="true" />
                )}
                {isArchived ? "Restore" : "Archive"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="rounded-lg"
                onSelect={() => setConfirmDelete(true)}
              >
                <Trash2 size={14} aria-hidden="true" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the captured item. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => run(() => remove.mutateAsync(item.id), "Deleted")}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}
