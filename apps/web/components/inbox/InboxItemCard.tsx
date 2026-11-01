"use client"

import { useState } from "react"
import {
  Archive,
  ArchiveRestore,
  CalendarClock,
  ListChecks,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ReminderButton } from "@/components/reminders/ReminderButton"
import { isSpringInboxEnabled } from "@/lib/feature-flags"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

function todayYmd(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

export function InboxItemCard({ item }: { item: InboxItem }) {
  const { togglePinned, archive, restore, remove, convertToNote, convertToTask, convertToJournal } =
    useInboxMutations()
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

  const capturedLabel = new Date(item.capturedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-sm transition-opacity",
        item.status !== "inbox" && "opacity-70",
        busy && "pointer-events-none opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{TYPE_LABEL[item.itemType]}</Badge>
          {item.status !== "inbox" && (
            <Badge variant="outline" className="capitalize">
              {item.status}
            </Badge>
          )}
          {item.convertedToType && (
            <Badge variant="outline">
              →{" "}
              {item.convertedToType === "note"
                ? "Note"
                : item.convertedToType === "task"
                  ? "Task"
                  : "Journal"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ReminderButton
            entityType="inbox_item"
            entityId={item.id}
            deepLink="https://hengo.henheang.site/inbox"
            defaultTitle={item.title?.trim() || item.content.slice(0, 60)}
            // Reminders can't follow an item that lives only in hspace-api yet
            // (see remindersApi.create).
            allowCreate={!isSpringInboxEnabled()}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={item.pinned ? "Unpin" : "Pin"}
            onClick={() =>
              run(
                () => togglePinned.mutateAsync({ id: item.id, pinned: !item.pinned }),
                item.pinned ? "Unpinned" : "Pinned",
              )
            }
          >
            {item.pinned ? (
              <Pin size={16} className="fill-current text-primary" />
            ) : (
              <PinOff size={16} />
            )}
          </Button>
        </div>
      </div>

      {item.title && (
        <h3 className="mt-2 break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
          {item.title}
        </h3>
      )}
      <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
        {item.content}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {item.tags.map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs">
            #{tag}
          </Badge>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarClock size={12} />
          {capturedLabel}
        </p>

        <div className="flex items-center gap-1">
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
                  <NotebookPen size={14} className="text-indigo-500" /> Convert to note
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
                  <ListChecks size={14} className="text-blue-500" /> Convert to task (today)
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-lg"
                  onClick={() =>
                    run(() => convertToJournal.mutateAsync(item), "Added to your journal")
                  }
                >
                  <Sparkles size={14} className="text-amber-500" /> Convert to journal entry
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={item.status === "archived" ? "Restore" : "Archive"}
            onClick={() =>
              run(
                () =>
                  item.status === "archived"
                    ? restore.mutateAsync(item.id)
                    : archive.mutateAsync(item.id),
                item.status === "archived" ? "Restored to inbox" : "Archived",
              )
            }
          >
            {item.status === "archived" ? <ArchiveRestore size={16} /> : <Archive size={16} />}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete">
                <Trash2 size={16} />
              </Button>
            </AlertDialogTrigger>
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
        </div>
      </div>
    </div>
  )
}
