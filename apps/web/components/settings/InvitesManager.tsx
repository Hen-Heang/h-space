"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { CheckCircle2, Loader2, Send, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useInviteMutations, useInvites } from "@/hooks/useInvites"
import type { SignupInvite } from "@/lib/api"

/**
 * Admin-only: invite an email to create an H-Space account (sign-up is
 * invite-only), and see or revoke invites. Rendered by the Settings page only
 * for admins; h-space-api enforces it either way.
 */
export function InvitesManager() {
  const { invites, loading, error } = useInvites()
  const { create, revoke } = useInviteMutations()
  const [email, setEmail] = useState("")

  const pending = invites.filter((invite) => invite.pending)
  const used = invites.filter((invite) => !invite.pending)

  function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const address = email.trim()
    if (!address) return
    create.mutate(address, {
      onSuccess: (invite) => {
        setEmail("")
        // The invite is saved even when its email fails; the link can be
        // re-sent by inviting the same address again.
        if (invite.emailSent === false) {
          toast.warning(`Invite saved, but the email to ${invite.email} didn't send. Try again.`)
        } else {
          toast.success(`Invite sent to ${invite.email}`)
        }
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't send invite."),
    })
  }

  function handleRevoke(invite: SignupInvite) {
    revoke.mutate(invite.id, {
      onSuccess: () => toast.success(`Invite for ${invite.email} revoked`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't revoke invite."),
    })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleInvite} className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          name="invite-email"
          autoComplete="off"
          placeholder="friend@example.com"
          aria-label="Email to invite"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-10 flex-1"
        />
        <Button type="submit" disabled={create.isPending || !email.trim()} className="h-10">
          {create.isPending ? (
            <Loader2 size={15} className="mr-1.5 animate-spin" />
          ) : (
            <Send size={15} className="mr-1.5" />
          )}
          Send invite
        </Button>
      </form>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : invites.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No invites yet. Invited people get an email with a sign-up link; each invite works for one
          account.
        </p>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <InviteList title={`Pending (${pending.length})`}>
              {pending.map((invite) => (
                <li key={invite.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Invited {formatDistanceToNow(new Date(invite.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={revoke.isPending && revoke.variables === invite.id}
                    onClick={() => handleRevoke(invite)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Revoke invite for ${invite.email}`}
                  >
                    <X size={15} className="mr-1" />
                    Revoke
                  </Button>
                </li>
              ))}
            </InviteList>
          )}
          {used.length > 0 && (
            <InviteList title={`Joined (${used.length})`}>
              {used.map((invite) => (
                <li key={invite.id} className="flex items-center gap-2.5 py-2.5">
                  <CheckCircle2
                    size={15}
                    className="shrink-0 text-emerald-600 dark:text-emerald-400"
                  />
                  <p className="min-w-0 truncate text-sm text-foreground">{invite.email}</p>
                  {invite.usedAt && (
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(invite.usedAt), { addSuffix: true })}
                    </span>
                  )}
                </li>
              ))}
            </InviteList>
          )}
        </div>
      )}
    </div>
  )
}

function InviteList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="divide-y divide-border/60">{children}</ul>
    </div>
  )
}
