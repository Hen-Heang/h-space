"use client"

import { WorkspaceTabs } from "@/components/layout/WorkspaceTabs"

/**
 * The Growth workspace's local tabs (Overview · Habits · Journal · Progress),
 * from `workspaceTabs.grow` in `lib/navigation.ts`. Recovery is reached from
 * the Growth overview's cards rather than a tab of its own.
 */
export function GrowthTabs({ actions }: { actions?: React.ReactNode }) {
  return <WorkspaceTabs sectionId="grow" actions={actions} className="mb-4" />
}
