"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import {
  Bell,
  Check,
  CheckCheck,
  DoorOpen,
  Edit,
  Mail,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  TriangleAlert,
  UserPlus,
  UserX,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { useNotifications } from "@/hooks/useNotifications"
import type { GoalNotification } from "@/lib/api"
import { cn } from "@/lib/utils"

// Ported from Orbit components/notifications/NotificationBell + NotificationItem,
// adapted to Hengo's Popover + the backend's camelCase GoalNotification shape.
// Sending invites is deferred sharing; receiving/responding is wired.

const ICONS: Record<string, typeof Bell> = {
  invitation: Mail,
  removal: UserX,
  member_left: DoorOpen,
  member_joined: UserPlus,
  task_created: Plus,
  task_deleted: Trash2,
  task_updated: Edit,
}

const TONE: Record<string, string> = {
  invitation: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  removal: "bg-red-500/10 text-red-600 dark:text-red-400",
  member_left: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  member_joined: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  task_created: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  task_deleted: "bg-red-500/10 text-red-600 dark:text-red-400",
  task_updated: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
}

function describe(n: GoalNotification): { title: string; body: string } {
  const who = n.senderDisplayName || "Someone"
  const goal = n.goalTitle ? `"${n.goalTitle}"` : "a goal"
  switch (n.type) {
    case "invitation":
      return { title: "Goal invitation", body: `${who} invited you to join ${goal}.` }
    case "removal":
      return { title: "Removed from goal", body: `You were removed from ${goal}.` }
    case "member_left":
      return { title: "Member left", body: `${who} left ${goal}.` }
    case "member_joined":
      return { title: "New member", body: `${who} joined ${goal}.` }
    case "task_created":
      return { title: "New task", body: `${who} added a task in ${goal}.` }
    case "task_deleted":
      return { title: "Task deleted", body: `${who} deleted a task in ${goal}.` }
    case "task_updated":
      return { title: "Task updated", body: `${who} updated a task in ${goal}.` }
    default:
      return {
        title: "Notification",
        body: n.goalTitle ? `Update in ${goal}.` : "You have an update.",
      }
  }
}

function NotificationRow({
  n,
  onMarkRead,
  onRespond,
  onNavigate,
}: {
  n: GoalNotification
  onMarkRead: (id: string) => void
  onRespond: (id: string, accept: boolean) => void
  onNavigate: (n: GoalNotification) => void
}) {
  const Icon = ICONS[n.type] ?? Target
  const tone = TONE[n.type] ?? "bg-primary/10 text-primary"
  const { title, body } = describe(n)
  const isInvite = n.type === "invitation"
  const invitePending = isInvite && (!n.invitationStatus || n.invitationStatus === "pending")
  const hasDestination = !invitePending && (!!n.goalId || !!n.url)

  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border px-3 py-3 transition-colors",
        !n.read
          ? "border-l-[3px] border-l-primary border-border bg-primary/[0.03]"
          : "border-border bg-card",
      )}
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", tone)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-foreground">{title}</p>
          {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
        </div>
        <p className="mt-0.5 text-[13px] font-medium leading-snug text-muted-foreground">{body}</p>

        {isInvite && n.invitationStatus === "accepted" && (
          <p className="mt-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            Accepted
          </p>
        )}
        {isInvite && n.invitationStatus === "declined" && (
          <p className="mt-1.5 text-xs font-bold text-muted-foreground">Declined</p>
        )}

        {invitePending && (
          <div className="mt-2.5 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-lg px-3 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onRespond(n.id, false)
              }}
            >
              Decline
            </Button>
            <Button
              size="sm"
              className="h-8 rounded-lg px-3 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onRespond(n.id, true)
              }}
            >
              Accept
            </Button>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground/70">
            {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ""}
          </span>
          <div className="flex items-center gap-2">
            {hasDestination && (
              <button
                type="button"
                onClick={() => onNavigate(n)}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary/70"
              >
                View detail
              </button>
            )}
            {!n.read && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkRead(n.id)
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
              >
                <Check className="h-3 w-3" /> Mark read
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** `className` lets each top bar size the trigger to match its other controls. */
export function NotificationBell({ className }: { className?: string } = {}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const {
    notifications,
    unreadCount,
    isLoading,
    isError,
    markRead,
    markAllRead,
    respond,
    refresh,
  } = useNotifications()

  const handleNavigate = (n: GoalNotification) => {
    if (!n.read) void markRead(n.id)
    setOpen(false)
    if (n.goalId) router.push(`/goals/${n.goalId}`)
    else if (n.url) router.push(n.url)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          className={cn(
            "relative h-11 w-11 rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-all hover:text-foreground active:scale-95",
            className,
          )}
        >
          <Bell size={18} strokeWidth={2.5} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground shadow-md ring-2 ring-background">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[min(calc(100vw-2rem),24rem)] overflow-hidden rounded-2xl p-0"
      >
        <div className="flex items-center justify-between border-b border-border bg-background/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-tight text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-primary">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[70vh] space-y-2 overflow-y-auto p-3 sm:max-h-[28rem]">
          {isLoading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
          ) : isError ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <TriangleAlert size={28} strokeWidth={1.75} />
              </div>
              <p className="text-sm font-bold tracking-tight text-foreground">
                Couldn&apos;t load notifications
              </p>
              <p className="mt-1 max-w-[220px] text-xs font-medium text-muted-foreground">
                Something went wrong reaching the server. Check your connection and try again.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void refresh()}
                className="mt-4 h-9 rounded-xl px-4 text-xs font-bold"
              >
                <RefreshCw size={14} className="mr-1.5" />
                Retry
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Bell size={28} strokeWidth={1.75} />
              </div>
              <p className="text-sm font-bold tracking-tight text-foreground">
                You&apos;re all caught up
              </p>
              <p className="mt-1 max-w-[220px] text-xs font-medium text-muted-foreground">
                Goal invitations and task updates will show up here.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationRow
                key={n.id}
                n={n}
                onMarkRead={markRead}
                onRespond={respond}
                onNavigate={handleNavigate}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default NotificationBell
