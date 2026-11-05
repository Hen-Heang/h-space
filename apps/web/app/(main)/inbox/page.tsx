"use client"

import { useMemo, useState } from "react"
import { Inbox, Plus } from "lucide-react"
import { motion } from "motion/react"

import { GoalsHubNav } from "@/components/goals/hub/GoalsHubNav"
import { InboxFilters } from "@/components/inbox/InboxFilters"
import { InboxItemCard } from "@/components/inbox/InboxItemCard"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { useInbox } from "@/hooks/useInbox"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import {
  collectInboxTags,
  resolveInboxTag,
  visibleInboxItems,
  type InboxFilters as InboxFiltersValue,
} from "@/lib/inbox"
import { containerVariants, itemVariants } from "@/lib/motion"
import { openQuickCapture } from "@/lib/quick-capture-bus"

export default function InboxPage() {
  useSessionTimer("inbox")
  const [filters, setFilters] = useState<InboxFiltersValue>({
    status: "inbox",
    type: "all",
    query: "",
  })

  const { items, loading, error, refetch } = useInbox({
    status: filters.status,
    itemType: filters.type,
  })

  const availableTags = useMemo(() => collectInboxTags(items), [items])
  // The Tag select used to be ignored here: only the search text reached the
  // filter. A tag no longer in the list falls back to "All tags".
  const activeTag = resolveInboxTag(filters.tag, availableTags)
  const visible = useMemo(
    () => visibleInboxItems(items, { query: filters.query, tag: activeTag }),
    [items, filters.query, activeTag],
  )

  const inboxCount = items.filter((item) => item.status === "inbox").length

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 pb-16"
    >
      <motion.div variants={itemVariants} className="space-y-3">
        <GoalsHubNav
          actions={
            <Button size="sm" onClick={() => openQuickCapture()} className="h-9 gap-1.5 rounded-md">
              <Plus size={16} aria-hidden="true" />
              Quick capture
            </Button>
          }
        />
        <p className="text-sm text-muted-foreground">
          Capture now, organize later.{" "}
          <span className="font-medium text-foreground tabular-nums">
            {loading ? "…" : inboxCount}
          </span>{" "}
          unprocessed.
        </p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <InboxFilters
          value={{ ...filters, tag: activeTag }}
          onChange={setFilters}
          availableTags={availableTags}
        />
      </motion.div>

      {/* One surface, divider rows — not a stack of bordered cards. */}
      <motion.div variants={itemVariants}>
        {loading ? (
          <div className="app-surface divide-y divide-border px-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="py-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-3/4" />
                <Skeleton className="mt-3 h-3 w-32" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            <span>{error}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            surface
            icon={Inbox}
            title={items.length === 0 ? "Nothing captured yet" : "Nothing matches these filters"}
            description={
              items.length === 0
                ? "Use Quick capture (⌘K, or the button above) to jot down your first thought."
                : undefined
            }
          />
        ) : (
          <ul className="app-surface divide-y divide-border px-4">
            {visible.map((item) => (
              <InboxItemCard key={item.id} item={item} />
            ))}
          </ul>
        )}
      </motion.div>
    </motion.div>
  )
}
