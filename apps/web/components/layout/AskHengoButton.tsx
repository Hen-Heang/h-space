"use client"

import Link from "next/link"
import { Sparkles } from "lucide-react"

import { ASK_HENGO_HREF, ASK_HENGO_LABEL } from "@/lib/navigation"
import { cn } from "@/lib/utils"

/**
 * The one entry point to the assistant, shown in both top bars. It always
 * opens General chat (`/chat`); "Search my workspace" and the Korean tools
 * are switched to from inside the assistant. The label stays visible at every
 * width — the icon only supports it.
 */
export function AskHengoButton({ className }: { className?: string }) {
  return (
    <Link
      href={ASK_HENGO_HREF}
      className={cn(
        // Same look as the outline Button; a Link because this navigates.
        "relative inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none transition-[color,background-color,border-color,box-shadow] hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/60",
        className,
      )}
    >
      <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
      {ASK_HENGO_LABEL}
    </Link>
  )
}
