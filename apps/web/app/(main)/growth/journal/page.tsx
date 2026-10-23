"use client"

import { useMemo, useState } from "react"
import { motion } from "motion/react"
import { Search } from "lucide-react"
import { toast } from "sonner"

import { GrowthTabs } from "@/components/growth/GrowthTabs"
import { JournalComposer } from "@/components/journal/JournalComposer"
import { JournalEntryCard } from "@/components/journal/JournalEntryCard"
import { ReminderButton } from "@/components/reminders/ReminderButton"
import { BackLink } from "@/components/ui/back-link"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useJournal, useJournalMutations } from "@/hooks/useJournal"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { filterJournalEntries, sortJournalEntries } from "@/lib/journal"
import { containerVariants, itemVariants } from "@/lib/motion"
import { getApiErrorMessage } from "@/lib/api"

function JournalLoadingState() {
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  )
}

export default function JournalPage() {
  useSessionTimer("journal")
  const { entries, loading, error } = useJournal()
  const { create } = useJournalMutations()
  const [query, setQuery] = useState("")

  const visible = useMemo(
    () => sortJournalEntries(filterJournalEntries(entries, { query })),
    [entries, query],
  )

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl pb-12">
        <BackLink href="/home" label="Home" mobileOnly />
        <GrowthTabs />
        <JournalLoadingState />
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="mx-auto max-w-2xl pb-12"
    >
      <motion.div variants={itemVariants} className="mb-2">
        <BackLink href="/home" label="Home" mobileOnly />
      </motion.div>
      <motion.div variants={itemVariants}>
        <GrowthTabs />
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="mb-4">
          <ErrorBanner>{error}</ErrorBanner>
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="mb-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="mb-1 text-lg font-semibold text-foreground">Today&apos;s reflection</h2>
            <p className="text-sm text-muted-foreground">
              A daily reflection — what you did, learned, struggled with, and want to do next.
              Nothing here is required.
            </p>
          </div>
          <div className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1.5">
            <span className="text-xs font-medium text-muted-foreground">Daily reminder</span>
            <ReminderButton
              entityType="journal_prompt"
              deepLink="https://hengo.henheang.site/growth/journal"
              defaultTitle="Time to journal"
            />
          </div>
        </div>
        <JournalComposer
          mode="create"
          onSave={async (input) => {
            try {
              await create.mutateAsync(input)
              toast.success("Entry saved")
            } catch (error) {
              toast.error(getApiErrorMessage(error, "Couldn't save that entry."))
              throw error
            }
          }}
        />
      </motion.div>

      {entries.length > 0 && (
        <motion.div variants={itemVariants} className="relative mb-4">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your journal…"
            className="pl-9"
          />
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="space-y-3">
        {visible.length === 0 && entries.length > 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing matches &quot;{query}&quot;.
          </p>
        )}
        {visible.map((entry) => (
          <JournalEntryCard key={entry.id} entry={entry} />
        ))}
      </motion.div>
    </motion.div>
  )
}
