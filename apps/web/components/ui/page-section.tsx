import { useId, type ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * A titled page section — the default way to organise a page. A heading
 * (`h2`, since the shell owns the page's `h1`), an optional one-line
 * description and at most one action, then the content. No border, no
 * background: whitespace separates sections, not boxes.
 *
 * ```tsx
 * <PageSection title="Today" action={<Button variant="ghost" size="sm">View all</Button>}>
 *   <RowList>…</RowList>
 * </PageSection>
 * ```
 */
export function PageSection({
  title,
  description,
  action,
  children,
  className,
  headingLevel = "h2",
  hideTitle = false,
  headingClassName,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  headingLevel?: "h2" | "h3"
  /** Keep the heading for screen readers only (the content is self-explanatory). */
  hideTitle?: boolean
  /** Overrides the heading's default size/colour (merged with tailwind-merge). */
  headingClassName?: string
}) {
  const headingId = useId()
  const Heading = headingLevel

  return (
    <section aria-labelledby={headingId} className={cn("min-w-0", className)}>
      <div
        className={cn(
          "mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1",
          hideTitle && !action && "sr-only",
        )}
      >
        <div className={cn("min-w-0", hideTitle && "sr-only")}>
          <Heading
            id={headingId}
            className={cn(
              "font-semibold tracking-tight text-foreground",
              headingLevel === "h2" ? "text-lg" : "text-base",
              headingClassName,
            )}
          >
            {title}
          </Heading>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      {children}
    </section>
  )
}
