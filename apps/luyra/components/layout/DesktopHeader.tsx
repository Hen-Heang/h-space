"use client";

import { getActiveNavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

import { ProfileMenu } from "./ProfileMenu";

/** Sticky top bar for tablet + desktop. The sidebar/rail owns product branding. */
export function DesktopHeader({ pathname, className }: { pathname: string; className?: string }) {
  const item = getActiveNavItem(pathname);
  const title = item?.label ?? "Luyra";

  return (
    <header className={cn("sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/90 px-6 py-3 backdrop-blur-sm", className)}>
      <div className="min-w-0">
        <h1 className="truncate text-[15px] font-semibold tracking-tight text-foreground">{title}</h1>
        {item?.description && <p className="truncate text-xs text-muted-foreground">{item.description}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <ProfileMenu collapsed side="bottom" align="end" className="size-11" />
      </div>
    </header>
  );
}
