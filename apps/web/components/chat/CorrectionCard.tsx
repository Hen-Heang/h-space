"use client"

import { useState } from "react"
import { BookmarkPlus, RotateCcw, Sparkles, X } from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { vocabApi } from "@/lib/api"
import type { TurnAnalysis } from "@/lib/ai/schemas/turn-analysis"
import { cn } from "@/lib/utils"

// Compact feedback card shown after a Korean chat turn the server flagged as
// having real mistakes (never for a clean turn — the caller only renders
// this when analysis.hasErrors is true). Deliberately not a full review
// quiz like CorrectionsReview — this is a glance-and-move-on nudge; the
// mistake is already saved into the correction SRS for real spaced review.
export function CorrectionCard({
  analysis,
  originalText,
  onDismiss,
  onTryAgain,
}: {
  analysis: TurnAnalysis
  originalText: string
  onDismiss: () => void
  onTryAgain: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const showNatural =
    analysis.naturalVersion.trim().length > 0 &&
    analysis.naturalVersion.trim() !== analysis.correctedText.trim()
  const explanation = analysis.overallExplanation || analysis.mistakes[0]?.explanation

  async function saveVocabulary() {
    if (saving || saved) return
    setSaving(true)
    try {
      await Promise.all(
        analysis.usefulVocabulary.map((item) =>
          vocabApi.save({
            category: "Chat",
            term: item.korean,
            meaning: item.english,
            example: item.example ?? undefined,
          }),
        ),
      )
      setSaved(true)
      toast.success(
        analysis.usefulVocabulary.length === 1
          ? "Saved to vocabulary"
          : `Saved ${analysis.usefulVocabulary.length} words to vocabulary`,
      )
    } catch {
      toast.error("Could not save vocabulary right now.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="mx-3 mb-3 overflow-hidden rounded-2xl border border-amber-500/25 bg-amber-500/[0.05] shadow-sm sm:mx-4"
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
            Quick correction
          </span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="-mr-1 -mt-1 flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground/50 hover:bg-accent/60 hover:text-foreground"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-2.5 px-4 py-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground/60">
            What you wrote
          </p>
          <p className="mt-0.5 break-keep text-sm font-semibold text-red-700/90 line-through dark:text-red-400/80">
            {originalText}
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground/60">
            Corrected
          </p>
          <p className="mt-0.5 break-keep text-sm font-bold text-foreground">
            {analysis.correctedText}
          </p>
        </div>

        {showNatural && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground/60">
              More natural
            </p>
            <p className="mt-0.5 break-keep text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              {analysis.naturalVersion}
            </p>
          </div>
        )}

        {explanation && <p className="text-xs leading-5 text-muted-foreground">{explanation}</p>}
      </div>

      <div className="flex flex-wrap gap-2 px-4 pb-3.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onTryAgain}
          className="h-8 rounded-lg border-border/70 bg-background/60 px-3 text-xs font-bold"
        >
          <RotateCcw size={12} className="mr-1.5" />
          Try again
        </Button>
        {analysis.usefulVocabulary.length > 0 && (
          <Button
            type="button"
            size="sm"
            onClick={saveVocabulary}
            disabled={saving || saved}
            className={cn(
              "h-8 rounded-lg px-3 text-xs font-bold text-white",
              saved ? "bg-emerald-600/70" : "bg-emerald-600 hover:bg-emerald-500",
            )}
          >
            <BookmarkPlus size={12} className="mr-1.5" />
            {saved ? "Saved" : saving ? "Saving…" : "Save vocabulary"}
          </Button>
        )}
      </div>
    </motion.div>
  )
}
