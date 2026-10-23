"use client";

import Link from "next/link";
import Image from "next/image";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { NavIconRow, NavRow } from "@/components/layout/NavItem";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { accountItem, financeItem, getActiveNavItem, primaryNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

import { ProfileMenu } from "./ProfileMenu";

export const SIDEBAR_EXPANDED_WIDTH = 232;
export const SIDEBAR_COLLAPSED_WIDTH = 72;

export function DesktopSidebar({
  pathname,
  collapsed,
  onToggleCollapsed,
  className,
}: {
  pathname: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  className?: string;
}) {
  const activeItem = getActiveNavItem(pathname);

  return (
    <aside
      aria-label="Main navigation"
      style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH }}
      className={cn("sticky top-0 flex h-dvh shrink-0 flex-col border-r border-border bg-sidebar", className)}
    >
      {/* Brand + collapse toggle. Branding lives here only — never also in the top bar. */}
      <div className={cn("flex items-center gap-2 px-3 py-4", collapsed && "flex-col gap-3")}>
        <Link
          href={financeItem.href}
          aria-label="Luyra home"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Image src="/luyra-mark-v2.png" alt="" width={36} height={36} className="size-6" priority />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold leading-tight text-foreground">Luyra</span>
              <span className="block truncate text-xs leading-tight text-muted-foreground">
                Track with clarity.
              </span>
            </span>
          )}
        </Link>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent>
        </Tooltip>
      </div>

      <div className="mx-3 h-px bg-border" />

      <nav aria-label="Primary" className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {primaryNavItems.map((item) =>
          collapsed ? (
            <NavIconRow key={item.id} item={item} active={activeItem?.id === item.id} />
          ) : (
            <NavRow key={item.id} item={item} active={activeItem?.id === item.id} />
          )
        )}
      </nav>

      {/* Account + profile menu */}
      <div className="space-y-1 border-t border-border px-3 py-3">
        {collapsed ? (
          <NavIconRow item={accountItem} active={activeItem?.id === accountItem.id} />
        ) : (
          <NavRow item={accountItem} active={activeItem?.id === accountItem.id} />
        )}
        <ProfileMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}
