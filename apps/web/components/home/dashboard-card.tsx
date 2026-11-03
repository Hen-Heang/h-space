import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * The one frame every Overview widget uses (docs/design-system.md): a single
 * bordered surface, a neutral-icon heading and at most one link. Content
 * inside is rows with dividers (`DASHBOARD_ROWS`) or a plain sentence
 * (`DashboardNote`) — never a bordered box inside the card.
 */
export function DashboardCard({
  title,
  icon: Icon,
  action,
  aside,
  children,
  className,
}: {
  title: ReactNode
  icon: LucideIcon
  action?: { href: string; label: string }
  /** Small trailing text beside the title instead of a link (e.g. a streak). */
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("app-surface min-w-0 p-4 sm:p-5", className)}>
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-2 text-base font-semibold text-foreground">
          <Icon size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
          <span className="truncate">{title}</span>
        </h3>
        {action ? (
          <Link
            href={action.href}
            className="inline-flex min-h-11 shrink-0 items-center rounded-md text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {action.label}
          </Link>
        ) : (
          aside
        )}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  )
}

/** Rows inside a DashboardCard: dividers, no per-row border. */
export const DASHBOARD_ROWS = "-mx-1 divide-y divide-border"

/** One row's padding and hover; pair with `DASHBOARD_ROWS` on the list. */
export const DASHBOARD_ROW =
  "flex min-h-12 min-w-0 items-center gap-2 rounded-md px-1 py-2 outline-none transition-colors"

/** An empty or error state inside a DashboardCard — a sentence, not a box. */
export function DashboardNote({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "error"
  children: ReactNode
}) {
  if (tone === "error") {
    return (
      <p role="alert" className="flex items-start gap-2 py-2 text-sm text-destructive">
        <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
        <span>{children}</span>
      </p>
    )
  }
  return <p className="py-2 text-sm text-muted-foreground">{children}</p>
}
