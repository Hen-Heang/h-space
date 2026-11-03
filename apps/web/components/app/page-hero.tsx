"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type PageHeroProps = {
  eyebrow: string
  title: string
  description: string
  variant?: "default" | "compact"
  actions?: ReactNode
  stats?: Array<{
    label: string
    value: string
    // Either makes the tile tappable — href navigates, onClick handles
    // in-page behavior (e.g. scrolling to a section).
    href?: string
    onClick?: () => void
  }>
  className?: string
  /**
   * The title's heading level. The shell header already renders the page's
   * only h1, so this is "h2" by default; "h1" is for a page rendered outside
   * the app shell.
   */
  headingLevel?: "h1" | "h2"
}

export function PageHero({
  eyebrow,
  title,
  description,
  variant = "default",
  actions,
  stats,
  className,
  headingLevel = "h2",
}: PageHeroProps) {
  const isCompact = variant === "compact"
  const Heading = headingLevel

  // A flat intro block (docs/design-system.md): no box, glow or hairline —
  // the shell header is the page's title, this is the section that opens it.
  return (
    <section className={cn("relative", className)}>
      <div>
        <div
          className={cn(
            "flex flex-col lg:flex-row lg:items-start lg:justify-between",
            isCompact ? "gap-4" : "gap-5",
          )}
        >
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
            <Heading
              className={cn(
                "font-semibold leading-tight tracking-tight text-foreground",
                isCompact ? "mt-1 text-xl sm:text-2xl" : "mt-1 text-2xl",
              )}
            >
              {title}
            </Heading>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {description}
            </p>
          </div>

          {actions && (
            <div className="flex w-full flex-col gap-2 min-[420px]:flex-row min-[420px]:flex-wrap sm:w-auto lg:max-w-md lg:justify-end">
              {actions}
            </div>
          )}
        </div>

        {stats && stats.length > 0 && (
          <div className={cn("border-t border-border/60", isCompact ? "mt-4 pt-3" : "mt-5 pt-4")}>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {stats.map((stat) => {
                const tappable = Boolean(stat.href || stat.onClick)
                const tileClass = cn(
                  "min-h-11 min-w-0 rounded-md bg-muted/60 px-3 py-2.5 text-left sm:min-w-28",
                  tappable && "transition-colors hover:bg-accent",
                )
                const inner = (
                  <>
                    <p className="font-mono text-base font-semibold tracking-tight text-foreground sm:text-lg">
                      {stat.value}
                    </p>
                    <p className="mt-0.5 wrap-break-word text-xs font-medium leading-4 text-muted-foreground">
                      {stat.label}
                    </p>
                  </>
                )
                if (stat.href) {
                  return (
                    <Link key={stat.label} href={stat.href} className={tileClass}>
                      {inner}
                    </Link>
                  )
                }
                if (stat.onClick) {
                  return (
                    <button
                      key={stat.label}
                      type="button"
                      onClick={stat.onClick}
                      className={tileClass}
                    >
                      {inner}
                    </button>
                  )
                }
                return (
                  <div key={stat.label} className={tileClass}>
                    {inner}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
