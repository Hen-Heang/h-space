"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getActiveNavItem, isDetailRoute } from "@/lib/navigation";
import { cn } from "@/lib/utils";

import { useMobileHeaderTitleValue } from "./mobile-header-title";

/**
 * Contextual mobile header. Root pages get just a title; detail pages get
 * `Back | Title`.
 */
export function MobileHeader({ pathname, className }: { pathname: string; className?: string }) {
  const router = useRouter();
  const publishedTitle = useMobileHeaderTitleValue();
  const detail = isDetailRoute(pathname);

  const navLabel = getActiveNavItem(pathname)?.label;
  const title = publishedTitle ?? navLabel ?? "Luyra";

  return (
    <header className={cn("sticky top-0 z-30 flex min-h-[calc(3.25rem+env(safe-area-inset-top))] items-center gap-1 border-b border-border/80 bg-background/88 px-2.5 pt-[env(safe-area-inset-top)] backdrop-blur-md", className)}>
      {detail && (
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft size={20} />
        </button>
      )}

      <h1 className={`min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight text-foreground ${detail ? "" : "pl-2"}`}>
        {title}
      </h1>
    </header>
  );
}
