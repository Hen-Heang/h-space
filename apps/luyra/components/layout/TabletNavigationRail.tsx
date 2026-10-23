"use client";

import Link from "next/link";
import Image from "next/image";

import { NavIconRow } from "@/components/layout/NavItem";
import { accountItem, financeItem, getActiveNavItem, primaryNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

import { ProfileMenu } from "./ProfileMenu";

export const RAIL_WIDTH = 80;

/**
 * 768–1199px navigation. Compact icon rail — the mobile bottom bar is never
 * used at these widths.
 */
export function TabletNavigationRail({ pathname, className }: { pathname: string; className?: string }) {
  const activeItem = getActiveNavItem(pathname);

  return (
    <aside
      aria-label="Main navigation"
      style={{ width: RAIL_WIDTH }}
      className={cn("sticky top-0 flex h-dvh shrink-0 flex-col border-r border-border bg-sidebar", className)}
    >
      <div className="flex justify-center px-2 py-4">
        <Link
          href={financeItem.href}
          aria-label="Luyra home"
          className="flex size-11 items-center justify-center rounded-lg bg-primary/10 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image src="/luyra-mark-v2.png" alt="" width={44} height={44} className="size-7" priority />
        </Link>
      </div>

      <div className="mx-3 h-px bg-border" />

      <nav aria-label="Primary" className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {primaryNavItems.map((item) => (
          <NavIconRow key={item.id} item={item} showLabel active={activeItem?.id === item.id} />
        ))}
      </nav>

      <div className="space-y-1 border-t border-border px-2 py-3">
        <NavIconRow item={accountItem} showLabel active={activeItem?.id === accountItem.id} />
        <ProfileMenu collapsed side="right" />
      </div>
    </aside>
  );
}
