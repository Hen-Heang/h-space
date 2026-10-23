"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

// One calm active-state system, shared by the sidebar, rail and More sheet:
// subtle accent background + stronger text + a thin left indicator. No
// sliding pill, no glow, no icon scaling.

export type NavRowVariant = "sidebar" | "list";

const ROW_BASE =
  "group relative flex items-center gap-3 rounded-lg text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background";

const ROW_SIZE: Record<NavRowVariant, string> = {
  // 44px min height everywhere so mobile touch targets are always compliant.
  sidebar: "min-h-11 px-3 py-2",
  list: "min-h-14 px-3.5 py-3 text-[15px]",
};

const ROW_STATE = {
  active: "bg-accent text-foreground font-semibold",
  idle: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
  soon: "cursor-default text-muted-foreground/50",
};

/** Thin left indicator — the only "chrome" an active row gets. */
function ActiveIndicator() {
  return (
    <span
      aria-hidden
      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
    />
  );
}

export function NavRow({
  item,
  active,
  variant = "sidebar",
  onNavigate,
  className,
  trailing,
  ...rest
}: {
  item: NavItem;
  active: boolean;
  variant?: NavRowVariant;
  onNavigate?: () => void;
  trailing?: React.ReactNode;
} & Omit<ComponentProps<typeof Link>, "href" | "item">) {
  const Icon = item.icon;
  const iconSize = variant === "list" ? 19 : 17;

  if (item.soon) {
    return (
      <div aria-disabled="true" className={cn(ROW_BASE, ROW_SIZE[variant], ROW_STATE.soon, className)}>
        <Icon size={iconSize} strokeWidth={2} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">Soon</span>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(ROW_BASE, ROW_SIZE[variant], active ? ROW_STATE.active : ROW_STATE.idle, className)}
      {...rest}
    >
      {active && <ActiveIndicator />}
      <Icon
        size={iconSize}
        strokeWidth={active ? 2.4 : 2}
        className={cn("shrink-0", item.color, !active && "opacity-70")}
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {trailing}
    </Link>
  );
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
  item: NavItem;
  active: boolean;
  /** Override the tooltip / accessible name. */
  label?: string;
  onNavigate?: () => void;
  /** Micro-label under the icon — used by the tablet rail. */
  showLabel?: boolean;
  className?: string;
}) {
  const Icon = item.icon;
  const name = label ?? item.label;

  if (item.soon) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            aria-disabled="true"
            aria-label={`${name} (soon)`}
            className={cn(
              "flex min-h-11 w-full flex-col items-center justify-center gap-1 rounded-lg py-2 text-muted-foreground/50",
              className
            )}
          >
            <Icon size={20} strokeWidth={2} className="shrink-0" />
            {showLabel && <span className="max-w-full truncate px-1 text-xs leading-none">{name}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">{name} · Soon</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={item.href}
          aria-label={name}
          aria-current={active ? "page" : undefined}
          onClick={onNavigate}
          className={cn(
            "relative flex min-h-11 w-full flex-col items-center justify-center gap-1 rounded-lg py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            className
          )}
        >
          {active && <ActiveIndicator />}
          <Icon size={20} strokeWidth={active ? 2.4 : 2} className={cn("shrink-0", item.color, !active && "opacity-70")} />
          {showLabel && (
            <span className={cn("max-w-full truncate px-1 text-xs leading-none", active && "font-semibold")}>
              {name}
            </span>
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{name}</TooltipContent>
    </Tooltip>
  );
}
