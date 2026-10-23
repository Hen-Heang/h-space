"use client"

import { motion } from "motion/react"

import { WorkspaceTabs } from "@/components/layout/WorkspaceTabs"
import { AddMemoryDialog } from "@/components/memory/AddMemoryDialog"
import { MemoryCandidateCard } from "@/components/memory/MemoryCandidateCard"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { useMemoryCandidates } from "@/hooks/useMemory"
import { containerVariants, itemVariants } from "@/lib/motion"

export default function AskHengoMemoriesPage() {
  const { candidates, loading, error } = useMemoryCandidates("all")

  const proposed = candidates.filter((c) => c.status === "proposed")
  const approved = candidates.filter((c) => c.status === "approved")
  const dismissed = candidates.filter((c) => c.status === "rejected" || c.status === "archived")

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="mx-auto max-w-2xl space-y-6 pb-16"
    >
      <motion.div variants={itemVariants} className="space-y-3">
        <WorkspaceTabs sectionId="memory" actions={<AddMemoryDialog />} />
        <p className="text-sm text-muted-foreground">
          Facts Hengo has noticed or you&apos;ve told it directly. Only approved memories are ever
          used to answer future questions.
        </p>
      </motion.div>

      {loading ? (
        <motion.div variants={itemVariants} className="space-y-3">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </motion.div>
      ) : error ? (
        <motion.div variants={itemVariants}>
          <ErrorBanner>{error}</ErrorBanner>
        </motion.div>
      ) : candidates.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card/50 px-5 py-12 text-center"
        >
          <p className="text-sm font-semibold text-foreground">No memories yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Ask Hengo a question and it may notice something worth remembering — or add one
            yourself.
          </p>
        </motion.div>
      ) : (
        <>
          {proposed.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Waiting for your review
              </h2>
              {proposed.map((c) => (
                <MemoryCandidateCard key={c.id} candidate={c} />
              ))}
            </motion.div>
          )}
          {approved.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Known context</h2>
              {approved.map((c) => (
                <MemoryCandidateCard key={c.id} candidate={c} />
              ))}
            </motion.div>
          )}
          {dismissed.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Rejected / archived</h2>
              {dismissed.map((c) => (
                <MemoryCandidateCard key={c.id} candidate={c} />
              ))}
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  )
}
