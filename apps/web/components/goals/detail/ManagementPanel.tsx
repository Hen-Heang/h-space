"use client"

import { LogOut, UserMinus, Users } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { InviteMembers } from "@/components/goals/InviteMembers"
import { ShareGoalCard } from "@/components/goals/ShareGoalCard"
import type { GoalMemberDto } from "@/lib/api"
import type { Goal } from "@/lib/goals"

interface ManagementPanelProps {
  isOpen: boolean
  goal: Goal
  goalId: string
  members: GoalMemberDto[]
  userId: string | null
  isOwner: boolean
  isArchived: boolean
  onClose: () => void
  onRefresh: () => void
  onEdit: () => void
  onLeave: () => void
  onRemoveMember: (userId: string, name: string) => void
  onExtendDeadline: (date: Date | null) => void
  onToggleArchive: () => void
  onDelete: () => void
}

/**
 * Members, sharing and settings — secondary management actions moved out of
 * the primary tab bar (which now carries only Overview / Plan / Schedule /
 * Progress). Nothing was removed: every collaboration action still lives here.
 */
export function ManagementPanel({
  isOpen,
  goal,
  goalId,
  members,
  userId,
  isOwner,
  isArchived,
  onClose,
  onRefresh,
  onEdit,
  onLeave,
  onRemoveMember,
  onExtendDeadline,
  onToggleArchive,
  onDelete,
}: ManagementPanelProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle className="text-base">Manage goal</SheetTitle>
          <SheetDescription className="text-xs">
            Members, sharing and settings for “{goal.title}”.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <Card className="rounded-xl border-border p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              People on this goal
            </h3>
            {members.length === 0 ? (
              <div className="mt-3 flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
                <Users size={16} />
                {isOwner ? "It's just you so far." : "No other members yet."}
              </div>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {members.map((m) => {
                  const name = m.displayName || m.email || "Member"
                  const isSelf = userId != null && String(m.userId) === String(userId)
                  const isCreator = m.role === "creator"
                  return (
                    <li key={m.id} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {name.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {name}
                          {isSelf && <span className="ml-1 text-muted-foreground">(you)</span>}
                        </p>
                        <p className="text-xs font-medium capitalize text-muted-foreground">
                          {m.role}
                        </p>
                      </div>
                      {isCreator ? (
                        <Badge
                          variant="secondary"
                          className="border-none bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                        >
                          Owner
                        </Badge>
                      ) : isSelf ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onLeave}
                          className="h-11 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive"
                        >
                          <LogOut size={14} /> Leave
                        </Button>
                      ) : isOwner ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveMember(m.userId, name)}
                          aria-label={`Remove ${name}`}
                          className="h-11 w-11 rounded-lg text-muted-foreground hover:text-destructive"
                        >
                          <UserMinus size={16} />
                        </Button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          {isOwner && (
            <Card className="rounded-xl border-border p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Invite members
              </h3>
              <p className="mt-1.5 mb-3 text-xs font-medium leading-relaxed text-muted-foreground">
                Search by name or email — they&apos;ll get an invitation in their notifications.
              </p>
              <InviteMembers goalId={goalId} onInvited={onRefresh} />
            </Card>
          )}

          {isOwner && (
            <ShareGoalCard goalId={goalId} shareCode={goal.share_code} onRegenerated={onRefresh} />
          )}

          {isOwner && (
            <Card className="rounded-xl border-border p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Settings
              </h3>
              <div className="mt-3 space-y-4">
                <Row title="Edit goal" description="Details, dates, and visuals.">
                  <Button
                    variant="outline"
                    onClick={onEdit}
                    className="h-11 rounded-xl text-xs font-semibold"
                  >
                    Edit
                  </Button>
                </Row>
                <Row title="Target date" description="Extend or change the deadline.">
                  <div className="w-full sm:w-56">
                    <DateTimePicker
                      value={goal.target_date ? new Date(goal.target_date) : null}
                      onChange={onExtendDeadline}
                    />
                  </div>
                </Row>
                <Row title="Goal status" description="Archive or reactivate this goal.">
                  <Button
                    variant="outline"
                    onClick={onToggleArchive}
                    className="h-11 rounded-xl text-xs font-semibold"
                  >
                    {isArchived ? "Unarchive" : "Archive"}
                  </Button>
                </Row>
              </div>
            </Card>
          )}

          {isOwner && (
            <Card className="rounded-xl border-destructive/20 bg-destructive/[0.02] p-4">
              <Row title="Delete goal" description="Permanently removes this goal and its tasks.">
                <Button
                  variant="destructive"
                  onClick={onDelete}
                  className="h-11 rounded-xl text-xs font-semibold"
                >
                  Delete
                </Button>
              </Row>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Row({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs font-medium leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
