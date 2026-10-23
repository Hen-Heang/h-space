"use client"

import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Centered message with recovery actions — used for every empty/error state on /vault. */
export function VaultEmptyState({
  icon: Icon,
  title,
  description,
  actions,
  tone = "default",
}: {
  icon: LucideIcon
  title: string
  description: string
  actions?: React.ReactNode
  tone?: "default" | "error"
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/60 px-5 py-12 text-center"
    >
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-2xl",
          tone === "error" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
        )}
        aria-hidden="true"
      >
        <Icon className="size-6" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  )
}
