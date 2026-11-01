"use client"

import { formatDistanceToNow } from "date-fns"
import {
  Copy,
  ExternalLink,
  Eye,
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
import { accountTitle, type VaultAccountActions } from "./VaultAccountCard"
import { CategoryChip, copyLoginIdentifier, ServiceAvatar, StatusBadge } from "./VaultAccountParts"

/**
 * A space-efficient alternative to cards for vaults with many accounts.
 * Reuses the same actions and the same client-side password handling as cards.
 */
export function VaultAccountRow({
  account,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopyPassword,
}: { account: VaultAccount } & VaultAccountActions) {
  const title = accountTitle(account)
  const href = safeWebsiteHref(account.websiteUrl)
  const updated = formatDistanceToNow(new Date(account.updatedAt), { addSuffix: true })

  return (
    <article
      aria-label={title}
      className="group flex min-w-0 flex-col gap-3 px-3 py-3 transition-colors hover:bg-muted/35 sm:px-4 lg:flex-row lg:items-center lg:gap-4"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <ServiceAvatar
          serviceName={account.serviceName}
          category={account.category}
          websiteUrl={account.websiteUrl}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            <button
              type="button"
              onClick={() => onView(account)}
              className="max-w-full truncate rounded-sm text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {account.serviceName}
            </button>
          </h3>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
            {account.accountLabel && (
              <span className="max-w-32 truncate text-xs text-muted-foreground">
                {account.accountLabel}
              </span>
            )}
            <CategoryChip category={account.category} label={getCategoryLabel(account.category)} />
            <StatusBadge status={account.status} />
          </div>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-1 rounded-lg bg-muted/45 py-1 pr-1 pl-3 lg:w-56 xl:w-72">
        <span className="sr-only">Login: </span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate font-mono text-xs",
            account.loginIdentifier ? "text-foreground" : "text-muted-foreground italic",
          )}
        >
          {account.loginIdentifier || "No login saved"}
        </span>
        {account.loginIdentifier && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => copyLoginIdentifier(account.loginIdentifier!)}
            aria-label={`Copy username or email for ${title}`}
          >
            <Copy className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 lg:justify-end">
        <span className="text-xs text-muted-foreground lg:hidden">Updated {updated}</span>
        <div className="flex items-center gap-1">
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open website for ${title} (opens in a new tab)`}
              className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          )}
          {account.passwordCiphertext && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onCopyPassword(account)}
              aria-label={`Copy password for ${title}`}
            >
              <KeyRound className="size-4" aria-hidden="true" />
            </Button>
          )}
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
              className={cn("size-4", account.isFavorite && "fill-current")}
              aria-hidden="true"
            />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(account)}
            aria-label={`Details for ${title}`}
          >
            <Eye className="size-4" aria-hidden="true" />
            Details
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
      </div>
    </article>
  )
}
