import Link from "next/link"
import { ArrowUpRight, Star, type LucideIcon } from "lucide-react"

import { PageSection } from "@/components/ui/page-section"

/**
 * Home's navigation links ("All tasks", "All goals", …). Muted on purpose:
 * the accent colour is kept for things you act on here (checking off a task
 * or habit, starting practice), not for links to other pages.
 */
export const HOME_LINK =
  "inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-medium text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"

/** The accent version, for a link that is the next thing to do (e.g. "Start practice"). */
const HOME_ACTION_LINK =
  "inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"

/**
 * A quiet sub-section used for Home's goals, habits, and learning summaries.
 * Its heading is smaller and muted, a step below the page's section headings
 * and visibly different from the 16px row text beneath it.
 */
export function CompactSummary({
  title,
  action,
  children,
}: {
  title: string
  /** `emphasis` marks the link as the next thing to do rather than navigation. */
  action?: { href: string; label: string; emphasis?: boolean }
  children: React.ReactNode
}) {
  return (
    <PageSection
      title={title}
      headingLevel="h3"
      headingClassName="text-sm font-medium tracking-normal text-muted-foreground"
      action={
        action ? (
          <Link href={action.href} className={action.emphasis ? HOME_ACTION_LINK : HOME_LINK}>
            {action.label}
          </Link>
        ) : undefined
      }
    >
      {children}
    </PageSection>
  )
}

/** Shared row rhythm for compact Home lists; text stays readable and wraps. */
export const HOME_ROW = "flex min-h-14 min-w-0 items-center gap-3 py-2 outline-none"

export function AppShortcut({
  href,
  title,
  icon: Icon,
  favorite = false,
  external = false,
}: {
  href: string
  title: string
  icon: LucideIcon
  favorite?: boolean
  external?: boolean
}) {
  const content = (
    <>
      <Icon size={18} aria-hidden="true" className="shrink-0 text-muted-foreground" />
      {favorite && (
        <Star size={14} aria-hidden="true" className="shrink-0 fill-amber-400 text-amber-400" />
      )}
      <span className="min-w-0 flex-1 break-words text-base font-medium text-foreground">
        {title}
      </span>
      <ArrowUpRight size={15} aria-hidden="true" className="shrink-0 text-muted-foreground" />
      {external && <span className="sr-only"> (opens in a new tab)</span>}
    </>
  )
  const className =
    "group flex min-h-14 min-w-0 items-center gap-3 rounded-md px-2 py-2 outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <li className="border-b border-border last:border-b-0 sm:border-0">
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
          {content}
        </a>
      ) : (
        <Link href={href} className={className}>
          {content}
        </Link>
      )}
    </li>
  )
}
