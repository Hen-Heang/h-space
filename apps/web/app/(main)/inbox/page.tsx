"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { motion } from "motion/react"

import { GoalsHubNav } from "@/components/goals/hub/GoalsHubNav"
import { InboxFilters } from "@/components/inbox/InboxFilters"
import { InboxItemCard } from "@/components/inbox/InboxItemCard"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useInbox } from "@/hooks/useInbox"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import {
  collectInboxTags,
  filterInboxItems,
  sortInboxItems,
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

  const { items, loading, error } = useInbox({
    status: filters.status,
    itemType: filters.type,
  })

  const availableTags = useMemo(() => collectInboxTags(items), [items])
  const visible = useMemo(
    () => sortInboxItems(filterInboxItems(items, { query: filters.query })),
    [items, filters.query],
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
        <InboxFilters value={filters} onChange={setFilters} availableTags={availableTags} />
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-border bg-card px-5 py-10 text-center">
            <p className="text-sm font-semibold text-muted-foreground">{error}</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card/50 px-5 py-12 text-center">
            <p className="text-sm font-semibold text-foreground">Nothing here yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {items.length === 0
                ? "Use Quick capture (⌘K → Quick capture, or the button above) to jot down your first thought."
                : "Nothing matches these filters."}
            </p>
          </div>
        ) : (
          visible.map((item) => <InboxItemCard key={item.id} item={item} />)
        )}
      </motion.div>
    </motion.div>
  )
}
