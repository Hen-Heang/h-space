"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Copy, Eye, EyeOff, ExternalLink, Pencil, Star, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getCategoryLabel, safeWebsiteHref, type VaultAccount } from "@/lib/vault"
import { accountTitle, type VaultAccountActions } from "./VaultAccountCard"
import { CategoryChip, copyLoginIdentifier, ServiceAvatar, StatusBadge } from "./VaultAccountParts"

const REVEAL_MS = 30_000

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[8rem_1fr] sm:gap-3">
      <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.06em]">
        {label}
      </dt>
      <dd className="min-w-0 text-sm text-foreground">{children}</dd>
    </div>
  )
}

export function VaultAccountDetailsDialog({
  account,
  onOpenChange,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopyPassword,
  onRevealPassword,
}: {
  account: VaultAccount | null
  onOpenChange: (open: boolean) => void
  /** Unlocks if needed and decrypts in the browser; null when cancelled or failed. */
  onRevealPassword: (account: VaultAccount) => Promise<string | null>
} & Omit<VaultAccountActions, "onView">) {
  const href = account ? safeWebsiteHref(account.websiteUrl) : null
  // The decrypted password, only while revealed. Cleared on close, on a
  // different account, and after REVEAL_MS.
  const [revealed, setRevealed] = useState<{ id: string; value: string } | null>(null)
  const shown = revealed && account && revealed.id === account.id ? revealed.value : null

  useEffect(() => {
    if (!revealed) return
    const timer = setTimeout(() => setRevealed(null), REVEAL_MS)
    return () => clearTimeout(timer)
  }, [revealed])

  const toggleReveal = async () => {
    if (!account) return
    if (shown) return setRevealed(null)
    const value = await onRevealPassword(account)
    if (value != null) setRevealed({ id: account.id, value })
  }

  return (
    <Dialog
      open={account != null}
      onOpenChange={(open) => {
        if (!open) setRevealed(null)
        onOpenChange(open)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        {account && (
          <>
            <DialogHeader className="flex-row items-center gap-3 pr-10">
              <ServiceAvatar
                serviceName={account.serviceName}
                category={account.category}
                websiteUrl={account.websiteUrl}
                size="lg"
              />
              <div className="min-w-0">
                <DialogTitle className="truncate text-lg">{account.serviceName}</DialogTitle>
                <DialogDescription className="truncate">
                  {account.accountLabel ?? "Account details"}
                </DialogDescription>
              </div>
            </DialogHeader>

            <dl className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Login">
                {account.loginIdentifier ? (
                  <div className="flex items-center gap-1">
                    <span className="min-w-0 flex-1 font-mono text-[0.8rem] break-all">
                      {account.loginIdentifier}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => copyLoginIdentifier(account.loginIdentifier!)}
                      aria-label="Copy username or email"
                    >
                      <Copy className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Not saved</span>
                )}
              </Row>
              <Row label="Password">
                {account.passwordCiphertext ? (
                  <div className="flex items-center gap-1">
                    <span
                      className="min-w-0 flex-1 font-mono text-[0.8rem] break-all"
                      aria-live="polite"
                    >
                      {shown ?? (
                        <span className="tracking-widest text-muted-foreground">
                          <span aria-hidden="true">••••••••</span>
                          <span className="sr-only">Hidden</span>
                        </span>
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={toggleReveal}
                      aria-label={shown ? "Hide password" : "Reveal password"}
                      aria-pressed={Boolean(shown)}
                    >
                      {shown ? (
                        <EyeOff className="size-4" aria-hidden="true" />
                      ) : (
                        <Eye className="size-4" aria-hidden="true" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onCopyPassword(account)}
                      aria-label="Copy password"
                    >
                      <Copy className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Not saved</span>
                )}
              </Row>
              <Row label="Website">
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-primary underline-offset-4 hover:underline"
                  >
                    {href}
                  </a>
                ) : (
                  <span className="text-muted-foreground">Not saved</span>
                )}
              </Row>
              <Row label="Category">
                <CategoryChip
                  category={account.category}
                  label={getCategoryLabel(account.category)}
                />
              </Row>
              <Row label="Status">
                <StatusBadge status={account.status} />
              </Row>
              <Row label="Tags">
                {account.tags.length > 0 ? (
                  <span className="flex flex-wrap gap-1">
                    {account.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </Row>
              <Row label="Updated">{format(new Date(account.updatedAt), "PPP")}</Row>
              <Row label="Added">{format(new Date(account.createdAt), "PPP")}</Row>
            </dl>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {href && (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary bg-linear-to-br from-primary-navy to-primary-accent px-4 text-sm font-semibold text-primary-action-foreground shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                  Open website
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
              <Button
                variant="outline"
                onClick={() => onToggleFavorite(account)}
                aria-pressed={account.isFavorite}
              >
                <Star
                  className={account.isFavorite ? "fill-current text-amber-500" : ""}
                  aria-hidden="true"
                />
                {account.isFavorite ? "Unfavorite" : "Favorite"}
              </Button>
              <Button variant="outline" onClick={() => onEdit(account)}>
                <Pencil aria-hidden="true" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => onDelete(account)}
                className="sm:ml-auto"
              >
                <Trash2 aria-hidden="true" />
                Delete
                <span className="sr-only"> {accountTitle(account)}</span>
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
