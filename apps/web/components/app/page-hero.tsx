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
   * h1, so pages that follow that rule pass "h2"; the default keeps existing
   * callers unchanged.
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
  headingLevel = "h1",
}: PageHeroProps) {
  const isCompact = variant === "compact"
  const Heading = headingLevel

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-lg border border-border/70 bg-card/90 shadow-sm shadow-slate-950/5 dark:bg-slate-900/70",
        isCompact ? "p-4 sm:p-5" : "p-5 sm:p-6",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        {!isCompact && (
          <div className="absolute -left-20 -top-24 h-56 w-56 rounded-full bg-primary/6 blur-[72px]" />
        )}
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/25 to-transparent" />
      </div>

      <div className="relative z-10">
        <div
          className={cn(
            "flex flex-col lg:flex-row lg:items-start lg:justify-between",
            isCompact ? "gap-4" : "gap-5",
          )}
        >
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
              {eyebrow}
            </p>
            <Heading
              className={cn(
                "font-semibold leading-tight tracking-[-0.025em] text-foreground",
                isCompact ? "mt-2 text-2xl sm:text-[1.75rem]" : "mt-2.5 text-[1.75rem] sm:text-3xl",
              )}
            >
              {title}
            </Heading>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
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
                  "min-h-11 min-w-0 rounded-md border border-border/60 bg-background/55 px-3 py-2.5 text-left dark:bg-white/[0.035] sm:min-w-28",
                  tappable &&
                    "transition-[border-color,background-color,transform] hover:border-primary/30 hover:bg-primary/5 active:scale-[0.98]",
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
