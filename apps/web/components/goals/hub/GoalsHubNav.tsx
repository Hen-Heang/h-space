"use client"

import { WorkspaceTabs } from "@/components/layout/WorkspaceTabs"

/**
 * The Planner's local tab nav (Tasks · Goals · Calendar · Overview · Inbox),
 * from `workspaceTabs.plan` in `lib/navigation.ts`. Kept as a named wrapper
 * so Planner pages that render tabs without the hub header's action (Inbox,
 * Calendar) read the same as the ones that do.
 */
export function GoalsHubNav({ actions }: { actions?: React.ReactNode }) {
  return <WorkspaceTabs sectionId="plan" actions={actions} />
}
