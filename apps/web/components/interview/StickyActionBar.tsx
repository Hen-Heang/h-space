import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * A session's main actions, kept within thumb reach on phones: fixed just above
 * the mobile bottom nav. From 640px up it sits in the normal flow.
 *
 * Fixed rather than `position: sticky` on purpose: the shell's <main> has
 * overflow-x-hidden, which makes it a scroll container, so sticky never
 * engages inside it. (Changing that is a shell-wide decision — several pages
 * have sticky elements that would start sticking.) QuestionBankBrowser uses
 * the same fixed pattern for its mobile action.
 *
 * Pages using it need enough bottom padding on phones (e.g. pb-36) so the last
 * content isn't hidden behind the bar.
 *
 * `pinned` = false keeps it in the flow (e.g. before there's an answer to act
 * on), so it doesn't cover the question's controls on a small screen.
 */
export function StickyActionBar({
  label,
  pinned = true,
  children,
}: {
  label: string
  pinned?: boolean
  children: ReactNode
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        pinned &&
          "fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:static sm:z-auto sm:px-0",
      )}
    >
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur sm:flex-row sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
        {children}
      </div>
    </div>
  )
}
