"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { motion } from "motion/react"

import { ReminderDialog } from "@/components/reminders/ReminderDialog"
import { ReminderRow } from "@/components/reminders/ReminderRow"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { useReminders } from "@/hooks/useReminders"
import { containerVariants, itemVariants } from "@/lib/motion"

export default function RemindersSettingsPage() {
  const { reminders, loading, error } = useReminders({ status: "all" })
  const [creating, setCreating] = useState(false)

  const active = reminders.filter((r) => r.status === "active")
  const paused = reminders.filter((r) => r.status === "paused")
  const finished = reminders.filter((r) => r.status === "completed" || r.status === "cancelled")

  // The old empty state only appeared when the learner had *no* reminders at
  // all. One cancelled row from months ago was enough to suppress it, so the
  // page rendered a lone "Completed / cancelled" heading and nothing else —
  // no explanation, and no way to create anything. "Nothing scheduled" is
  // about the live ones, so that's what gates the empty state now.
  const nothingScheduled = active.length === 0 && paused.length === 0

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="mx-auto max-w-2xl space-y-6 pb-16"
    >
      <motion.div variants={itemVariants}>
        <BackLink href="/settings" label="Settings" desktopOnly />
        <div className="mt-2 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">Reminders</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything you&apos;ve set a reminder for — tasks, habits, notes, inbox items,
              journal, and activities.
            </p>
          </div>
          <Button type="button" size="sm" className="shrink-0" onClick={() => setCreating(true)}>
            <Plus size={15} strokeWidth={2.5} />
            New
          </Button>
        </div>
      </motion.div>

      {/* Reminders set from a bell icon carry that item's entityType and deep
          link. One created here belongs to nothing in particular, so it is a
          "manual_activity" with no entityId — the same type the Log Activity
          dialog uses. */}
      <ReminderDialog
        open={creating}
        onOpenChange={setCreating}
        entityType="manual_activity"
        defaultTitle=""
      />

      {loading ? (
        <motion.div variants={itemVariants} className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </motion.div>
      ) : error ? (
        <motion.div variants={itemVariants}>
          <ErrorBanner>{error}</ErrorBanner>
        </motion.div>
      ) : (
        <>
          {nothingScheduled && (
            <motion.div
              variants={itemVariants}
              className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center"
            >
              <p className="text-sm font-semibold text-foreground">Nothing scheduled</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Create one here, or use the bell icon on a habit, note, inbox item, or the Journal
                page to attach a reminder to that item.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setCreating(true)}
              >
                <Plus size={15} strokeWidth={2.5} />
                New reminder
              </Button>
            </motion.div>
          )}

          {active.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">Active</h3>
              <div className="app-surface divide-y divide-border px-4">
                {active.map((r) => (
                  <ReminderRow key={r.id} reminder={r} />
                ))}
              </div>
            </motion.div>
          )}
          {paused.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">Paused</h3>
              <div className="app-surface divide-y divide-border px-4">
                {paused.map((r) => (
                  <ReminderRow key={r.id} reminder={r} />
                ))}
              </div>
            </motion.div>
          )}
          {finished.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">Completed / cancelled</h3>
              <div className="app-surface divide-y divide-border px-4">
                {finished.map((r) => (
                  <ReminderRow key={r.id} reminder={r} />
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  )
}
