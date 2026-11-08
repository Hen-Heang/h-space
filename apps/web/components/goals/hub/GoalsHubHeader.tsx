"use client"

import Link from "next/link"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

import { GoalsHubNav } from "./GoalsHubNav"

interface GoalsHubHeaderProps {
  description: string
  stats?: Array<{ label: string; value: string }>
  /**
   * "secondary" on pages whose own primary action lives in the content
   * (Tasks' composer), so the view keeps one filled button. New goal stays
   * reachable either way.
   */
  newGoalEmphasis?: "primary" | "secondary"
}

/**
 * Shared header for the Planner's Goals/Tasks/Overview routes: the local tabs
 * with one primary action ("New goal") beside them, then a one-line
 * description. The page title itself lives in the shell header
 * (`Planner / Goals`), so there is no second hero repeating it. Per-tab
 * stats are opt-in (Overview only) and render as a compact inline row.
 */
export function GoalsHubHeader({
  description,
  stats,
  newGoalEmphasis = "primary",
}: GoalsHubHeaderProps) {
  return (
    <div className="space-y-3">
      <GoalsHubNav
        actions={
          <Button
            asChild
            size="sm"
            variant={newGoalEmphasis === "primary" ? "default" : "outline"}
            className="h-9 rounded-md px-3"
          >
            <Link href="/goals/create">
              <Plus size={16} aria-hidden="true" />
              New goal
            </Link>
          </Button>
        }
      />
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="text-sm text-muted-foreground">{description}</p>
        {stats && stats.length > 0 && (
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-1.5">
                <dt className="text-muted-foreground">{stat.label}</dt>
                <dd className="font-semibold tabular-nums text-foreground">{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  )
}
