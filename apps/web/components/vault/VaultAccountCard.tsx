"use client"

import { formatDistanceToNow } from "date-fns"
import {
  Copy,
  Eye,
  ExternalLink,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getCategoryLabel, safeWebsiteHref, type VaultAccount } from "@/lib/vault"
import { cn } from "@/lib/utils"
import { CategoryChip, copyLoginIdentifier, ServiceAvatar, StatusBadge } from "./VaultAccountParts"

export type VaultAccountActions = {
  onView: (account: VaultAccount) => void
  onEdit: (account: VaultAccount) => void
  onDelete: (account: VaultAccount) => void
  onToggleFavorite: (account: VaultAccount) => void
  /** Unlocks if needed, decrypts in the browser, and copies (auto-clearing). */
  onCopyPassword: (account: VaultAccount) => void
}

export function accountTitle(account: VaultAccount): string {
  return account.accountLabel
    ? `${account.serviceName} (${account.accountLabel})`
    : account.serviceName
}

export function VaultAccountCard({
  account,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopyPassword,
}: { account: VaultAccount } & VaultAccountActions) {
  const href = safeWebsiteHref(account.websiteUrl)
  const title = accountTitle(account)
  const updated = formatDistanceToNow(new Date(account.updatedAt), { addSuffix: true })

  return (
    <article
      aria-label={title}
      className="group flex h-full min-w-0 flex-col rounded-2xl border border-border bg-card p-4 shadow-sm shadow-slate-950/5 transition-colors hover:border-primary/35 hover:bg-muted/10 dark:bg-slate-900/40"
    >
      <div className="flex items-start gap-3">
        <ServiceAvatar
          serviceName={account.serviceName}
          category={account.category}
          websiteUrl={account.websiteUrl}
        />
        <div className="min-w-0 flex-1">
          <h3 className="min-w-0 text-base font-semibold text-foreground">
            <button
              type="button"
              onClick={() => onView(account)}
              // -my/py grows the tap area to ~44px without moving the layout.
              // The button truncates itself; a clipping h3 would cut the padding off.
              className="-my-2.5 block max-w-full truncate rounded-sm py-2.5 text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {account.serviceName}
            </button>
          </h3>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
            {account.accountLabel && (
              <span className="truncate text-xs font-medium text-muted-foreground">
                {account.accountLabel}
              </span>
            )}
            <CategoryChip category={account.category} label={getCategoryLabel(account.category)} />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onToggleFavorite(account)}
          aria-pressed={account.isFavorite}
          aria-label={
            account.isFavorite ? `Remove ${title} from favorites` : `Add ${title} to favorites`
          }
          className={cn(account.isFavorite ? "text-amber-500" : "text-muted-foreground")}
        >
          <Star
            className={cn("size-4.5", account.isFavorite && "fill-current")}
            aria-hidden="true"
          />
        </Button>
      </div>

      <div className="mt-4 flex min-h-11 items-center gap-1 rounded-xl bg-muted/50 py-1 pr-1 pl-3">
        <span className="sr-only">Login: </span>
        {account.loginIdentifier ? (
          <>
            <span className="min-w-0 flex-1 truncate font-mono text-[0.8rem] text-foreground">
              {account.loginIdentifier}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => copyLoginIdentifier(account.loginIdentifier!)}
              aria-label={`Copy username or email for ${title}`}
            >
              <Copy className="size-4" aria-hidden="true" />
            </Button>
          </>
        ) : (
          <span className="flex-1 text-[0.8rem] text-muted-foreground italic">
            No username or email saved
          </span>
        )}
      </div>

      {account.passwordCiphertext && (
        <div className="mt-2 flex min-h-10 items-center justify-between gap-2 rounded-xl border border-dashed border-border/80 px-3 py-1.5">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <KeyRound className="size-3.5 shrink-0" aria-hidden="true" />
            Password saved
            <span className="sr-only">, encrypted</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCopyPassword(account)}
            aria-label={`Copy password for ${title}`}
            className="min-h-9"
          >
            <Copy className="size-4" aria-hidden="true" />
            Copy
          </Button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <StatusBadge status={account.status} />
        <span>Updated {updated}</span>
      </div>

      <div className="mt-auto flex items-center gap-1 border-t border-border pt-3">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring [@media(pointer:coarse)]:min-h-11"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Open website
            <span className="sr-only"> for {title} (opens in a new tab)</span>
          </a>
        ) : null}
        <Button variant="ghost" size="sm" onClick={() => onView(account)} className="ml-auto">
          <Eye aria-hidden="true" />
          Details
          <span className="sr-only"> for {title}</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${title}`}>
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuItem onSelect={() => onEdit(account)} className="min-h-10">
              <Pencil aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => onDelete(account)}
              className="min-h-10"
            >
              <Trash2 aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  )
}
