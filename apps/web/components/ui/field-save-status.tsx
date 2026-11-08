"use client"

import { AnimatePresence, motion } from "motion/react"
import { AlertCircle, Check, Loader2 } from "lucide-react"

import type { FieldSaveState } from "@/hooks/useFieldAutosave"
import { cn } from "@/lib/utils"

/**
 * The visible half of per-field autosave (see hooks/useFieldAutosave).
 * Renders beside a field's label, so the confirmation lands next to the thing
 * that changed rather than in a corner of the page.
 *
 * `aria-live="polite"` rather than "assertive": a save confirmation should
 * reach a screen reader, but never interrupt what it is already reading.
 */
export function FieldSaveStatus({
  state,
  className,
}: {
  state: FieldSaveState
  className?: string
}) {
  return (
    <span
      aria-live="polite"
      className={cn("inline-flex h-4 items-center text-xs font-medium", className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        {state === "saving" && (
          <motion.span
            key="saving"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="inline-flex items-center gap-1 text-muted-foreground"
          >
            <Loader2 size={11} className="animate-spin" aria-hidden="true" />
            Saving…
          </motion.span>
        )}
        {state === "saved" && (
          <motion.span
            key="saved"
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
          >
            <Check size={11} strokeWidth={3} aria-hidden="true" />
            Saved
          </motion.span>
        )}
        {state === "error" && (
          <motion.span
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="inline-flex items-center gap-1 text-destructive"
          >
            <AlertCircle size={11} aria-hidden="true" />
            Not saved
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
