import Link from "next/link"
import { ArrowUpRight, Star, type LucideIcon } from "lucide-react"

import { PageSection } from "@/components/ui/page-section"

/** A quiet sub-section used for Home's goals, habits, and learning summaries. */
export function CompactSummary({
  title,
  action,
  children,
}: {
  title: string
  action?: { href: string; label: string }
  children: React.ReactNode
}) {
  return (
    <PageSection
      title={title}
      headingLevel="h3"
      action={
        action ? (
          <Link
            href={action.href}
            className="inline-flex min-h-11 items-center rounded-md text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
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
