"use client"

import { motion } from "motion/react"

import { WorkspaceTabs } from "@/components/layout/WorkspaceTabs"
import { AddMemoryDialog } from "@/components/memory/AddMemoryDialog"
import { MemoryCandidateCard } from "@/components/memory/MemoryCandidateCard"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { useMemoryCandidates } from "@/hooks/useMemory"
import { containerVariants, itemVariants } from "@/lib/motion"
import { Brain } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"

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
        <motion.div variants={itemVariants}>
          <EmptyState
            surface
            icon={Brain}
            title="No memories yet"
            description="Ask Hengo a question and it may notice something worth remembering — or add one yourself."
          />
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
