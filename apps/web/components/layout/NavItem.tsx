"use client"

import Link from "next/link"
import type { ComponentProps } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { NavItem } from "@/lib/navigation"
import { cn } from "@/lib/utils"

// One calm active-state system, shared by the sidebar, tablet rail and More
// sheet: a subtle accent background, stronger text, and a thin left
// indicator. Icons stay neutral (no per-item colors) so the chrome reads as
// one quiet surface; the global prefers-reduced-motion rule in globals.css
// handles the rest.

export type NavRowVariant = "sidebar" | "list"

const ROW_BASE =
  "group relative flex items-center gap-2.5 rounded-md text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"

const ROW_SIZE: Record<NavRowVariant, string> = {
  // Compact desktop rows; the touch-first list keeps a 48px+ target.
  sidebar: "min-h-9 px-2.5 py-1.5",
  list: "min-h-12 px-3 py-2.5 text-[15px]",
}

const ROW_STATE = {
  active: "bg-accent text-foreground",
  idle: "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
  soon: "cursor-default text-muted-foreground/50",
}

/** Thin left indicator — the only "chrome" an active row gets. */
export function ActiveIndicator() {
  return (
    <span
      aria-hidden
      className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
    />
  )
}

export function NavRow({
  item,
  active,
  variant = "sidebar",
  onNavigate,
  className,
  trailing,
  showDescription = false,
  ...rest
}: {
  item: NavItem
  active: boolean
  variant?: NavRowVariant
  onNavigate?: () => void
  trailing?: React.ReactNode
  /** Second line with `item.description` — used by the mobile More sheet. */
  showDescription?: boolean
} & Omit<ComponentProps<typeof Link>, "href" | "item">) {
  const Icon = item.icon
  const iconSize = variant === "list" ? 18 : 16

  if (item.soon) {
    return (
      <div
        aria-disabled="true"
        className={cn(ROW_BASE, ROW_SIZE[variant], ROW_STATE.soon, className)}
      >
        <Icon size={iconSize} strokeWidth={2} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">Soon</span>
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        ROW_BASE,
        ROW_SIZE[variant],
        active ? ROW_STATE.active : ROW_STATE.idle,
        className,
      )}
      {...rest}
    >
      {active && <ActiveIndicator />}
      <Icon
        size={iconSize}
        strokeWidth={2}
        aria-hidden
        className={cn("shrink-0", active ? "text-foreground" : "text-muted-foreground")}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{item.label}</span>
        {showDescription && item.description && (
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {item.description}
          </span>
        )}
      </span>
      {trailing}
    </Link>
  )
}

/**
 * Icon-only row for the collapsed sidebar and the tablet rail. The accessible
 * name comes from `aria-label` (not the tooltip) so it works without hover.
 */
export function NavIconRow({
  item,
  active,
  label,
  onNavigate,
  showLabel = false,
  className,
}: {
  item: NavItem
  active: boolean
  /** Override the tooltip / accessible name. */
  label?: string
  onNavigate?: () => void
  /** Micro-label under the icon — used by the tablet rail. */
  showLabel?: boolean
  className?: string
}) {
  const Icon = item.icon
  const name = label ?? item.label

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={item.href}
          aria-label={name}
          aria-current={active ? "page" : undefined}
          onClick={onNavigate}
          className={cn(
            "relative flex w-full flex-col items-center justify-center gap-1 rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            showLabel ? "min-h-14 py-2" : "min-h-10 py-2",
            active
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            className,
          )}
        >
          {active && <ActiveIndicator />}
          <Icon size={18} strokeWidth={2} aria-hidden className="shrink-0" />
          {showLabel && (
            <span
              className={cn(
                "max-w-full truncate px-1 text-[11px] leading-none",
                active && "font-semibold",
              )}
            >
              {item.shortLabel ?? name}
            </span>
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{name}</TooltipContent>
    </Tooltip>
  )
}
