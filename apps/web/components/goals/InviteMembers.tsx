"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Search, UserPlus, Check } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { goalsApi, userApi, getApiErrorMessage, type SearchUser } from "@/lib/api"
import { cn } from "@/lib/utils"

interface InviteMembersProps {
  goalId: string
  /** Called after a successful invite so the parent can refetch members. */
  onInvited?: () => void
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function InviteMembers({ goalId, onInvited }: InviteMembersProps) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [results, setResults] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set())

  // Debounce the query (250ms) to avoid a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 250)
    return () => clearTimeout(id)
  }, [query])

  // Track the latest request so out-of-order responses can't overwrite newer ones.
  const requestRef = useRef(0)
  useEffect(() => {
    if (!debouncedQuery) {
      setResults([])
      setLoading(false)
      return
    }
    const reqId = ++requestRef.current
    setLoading(true)
    userApi
      .search(debouncedQuery)
      .then((users) => {
        if (requestRef.current === reqId) setResults(users)
      })
      .catch(() => {
        if (requestRef.current === reqId) setResults([])
      })
      .finally(() => {
        if (requestRef.current === reqId) setLoading(false)
      })
  }, [debouncedQuery])

  async function handleInvite(user: SearchUser) {
    setPendingId(user.id)
    try {
      await goalsApi.invite(goalId, user.id)
      setInvitedIds((prev) => new Set(prev).add(user.id))
      toast.success("Invitation sent", {
        description: `Invited ${user.displayName || user.email || "user"} to this goal.`,
      })
      onInvited?.()
    } catch (e) {
      toast.error("Could not send invitation", {
        description: getApiErrorMessage(e, "Please try again."),
      })
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people by name or email…"
          className="h-11 rounded-xl pl-9"
          aria-label="Search people to invite"
        />
        {loading && (
          <Loader2
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground/50"
          />
        )}
      </div>

      <div className="max-h-72 space-y-1.5 overflow-y-auto">
        {!loading && debouncedQuery && results.length === 0 && (
          <p className="px-1 py-6 text-center text-sm font-medium text-muted-foreground">
            No people found for “{debouncedQuery}”.
          </p>
        )}

        {results.map((user) => {
          const name = user.displayName || user.email || "User"
          const invited = invitedIds.has(user.id)
          return (
            <div
              key={user.id}
              className="flex items-center justify-between gap-3 rounded-xl p-2 transition-colors hover:bg-accent/50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={user.avatarUrl || undefined} alt={name} />
                  <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{name}</p>
                  {user.email && user.displayName && (
                    <p className="truncate text-xs font-medium text-muted-foreground">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant={invited ? "secondary" : "outline"}
                className={cn(
                  "h-9 shrink-0 rounded-lg font-bold",
                  invited && "text-emerald-600 dark:text-emerald-400",
                )}
                disabled={pendingId === user.id || invited}
                onClick={() => handleInvite(user)}
              >
                {pendingId === user.id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : invited ? (
                  <>
                    <Check size={15} /> Invited
                  </>
                ) : (
                  <>
                    <UserPlus size={15} /> Invite
                  </>
                )}
              </Button>
            </div>
          )
        })}

        {!debouncedQuery && (
          <p className="px-1 py-6 text-center text-sm font-medium text-muted-foreground">
            Start typing to find people to invite to this goal.
          </p>
        )}
      </div>
    </div>
  )
}
