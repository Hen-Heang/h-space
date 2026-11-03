import Link from "next/link"
import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * A list of rows separated by subtle dividers — the default for any
 * collection of text records (tasks, notes, settings, entries). `surface`
 * puts the list on one bordered card when it needs separating from the page;
 * otherwise it sits flat in its section.
 */
export function RowList({
  children,
  className,
  surface = false,
  ...props
}: ComponentProps<"ul"> & { surface?: boolean }) {
  return (
    <ul
      className={cn("divide-y divide-border", surface && "app-surface overflow-hidden", className)}
      {...props}
    >
      {children}
    </ul>
  )
}

type RowContentProps = {
  /** Leading visual — an icon (16–20px, neutral), checkbox or avatar. */
  leading?: ReactNode
  title: ReactNode
  /** Secondary line — description or metadata (14px, muted). */
  description?: ReactNode
  /** Trailing content — a value, status, chevron. Not for primary content. */
  trailing?: ReactNode
}

const ROW =
  "flex min-h-14 w-full min-w-0 items-center gap-3 px-3 py-3 text-left outline-none sm:px-4"
const ROW_INTERACTIVE =
  "transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"

function RowContent({ leading, title, description, trailing }: RowContentProps) {
  return (
    <>
      {leading && (
        <span className="flex shrink-0 items-center text-muted-foreground">{leading}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 break-words text-base font-medium leading-snug text-foreground">
          {title}
        </span>
        {description && (
          <span className="mt-0.5 block break-words text-sm text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      {trailing && (
        <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
          {trailing}
        </span>
      )}
    </>
  )
}

/**
 * One row of a `RowList`. Renders a link (`href`), a button (`onClick`) or a
 * static row. The whole row is the target, so it's always ≥56px tall. Put
 * per-row secondary actions in `trailing` as separate buttons only when the
 * row itself isn't interactive — never nest a button inside a link row.
 */
export function InteractiveRow({
  href,
  onClick,
  className,
  external = false,
  ...content
}: RowContentProps & {
  href?: string
  onClick?: () => void
  className?: string
  /** Open `href` in a new tab. */
  external?: boolean
}) {
  if (href) {
    return (
      <li>
        {external ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(ROW, ROW_INTERACTIVE, className)}
          >
            <RowContent {...content} />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <Link href={href} className={cn(ROW, ROW_INTERACTIVE, className)}>
            <RowContent {...content} />
          </Link>
        )}
      </li>
    )
  }
  if (onClick) {
    return (
      <li>
        <button type="button" onClick={onClick} className={cn(ROW, ROW_INTERACTIVE, className)}>
          <RowContent {...content} />
        </button>
      </li>
    )
  }
  return (
    <li className={cn(ROW, className)}>
      <RowContent {...content} />
    </li>
  )
}
