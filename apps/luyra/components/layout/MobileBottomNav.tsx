"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import { bottomTabs, getActiveBottomTabIndex, isMoreSectionActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const TAB =
  "relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 outline-none transition-[color,background-color,transform] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:scale-[0.97] motion-reduce:transition-none";
const TAB_ON = "bg-foreground/[0.07] text-foreground dark:bg-white/[0.09]";
const TAB_OFF = "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground";
const LABEL = "max-w-full truncate text-[10px] leading-3 font-medium xs:text-[11px]";

/**
 * The core money-flow destinations plus a "More" slot for everything else —
 * a Telegram-style tab strip on an iOS "glass" (frosted, translucent) bar.
 * When the soft keyboard is open the whole element is unmounted by `AppShell`
 * rather than hidden, so nothing inside stays in the tab order.
 */
export function MobileBottomNav({
  pathname,
  onOpenMore,
  moreOpen,
  className,
}: {
  pathname: string;
  onOpenMore: () => void;
  moreOpen: boolean;
  className?: string;
}) {
  const activeIndex = getActiveBottomTabIndex(pathname);
  const moreActive = isMoreSectionActive(pathname);
  // Open counts as highlighted so the sheet and its trigger read as one control.
  const moreHighlighted = moreActive || moreOpen;

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-2.5 z-40 bottom-[calc(env(safe-area-inset-bottom)+var(--mobile-nav-gap))] xs:inset-x-3",
        className
      )}
    >
      <div className="relative overflow-hidden rounded-[22px] border border-foreground/10 bg-background/75 shadow-[0_10px_35px_rgba(0,0,0,0.14),0_-4px_18px_rgba(0,0,0,0.06)] backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/[0.62] dark:border-white/[0.12] dark:bg-background/[0.58]">
        <span aria-hidden className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/25" />

        <ul className="mx-auto flex max-w-lg items-stretch gap-0.5 p-1.5">
          {bottomTabs.map((item, index) => {
            const active = index === activeIndex;
            const Icon = item.icon;
            return (
              <li key={item.id} className="flex min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(TAB, active ? TAB_ON : TAB_OFF)}
                >
                  <Icon size={23} strokeWidth={active ? 2.2 : 1.9} aria-hidden className="shrink-0" />
                  <span className={cn(LABEL, active && "font-semibold")}>
                    {item.shortLabel ?? item.label}
                  </span>
                </Link>
              </li>
            );
          })}

          <li className="flex min-w-0 flex-1">
            <button
              type="button"
              onClick={onOpenMore}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              aria-current={moreActive ? "page" : undefined}
              className={cn(TAB, moreHighlighted ? TAB_ON : TAB_OFF)}
            >
              <Menu size={23} strokeWidth={moreHighlighted ? 2.2 : 1.9} aria-hidden className="shrink-0" />
              <span className={cn(LABEL, moreHighlighted && "font-semibold")}>More</span>
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}
