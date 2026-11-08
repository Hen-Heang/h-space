"use client"

import { useState } from "react"
import { BookmarkPlus, RotateCcw, Sparkles, X, Check } from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { vocabApi } from "@/lib/api"
import type { TurnAnalysis } from "@/lib/ai/schemas/turn-analysis"

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
      className="mx-3 mb-3 overflow-hidden rounded-lg border border-border bg-card sm:mx-4"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <Sparkles aria-hidden="true" size={16} className="text-primary" />
          <span className="text-sm font-medium text-foreground">Quick correction</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="relative -mr-1.5 flex size-8 items-center justify-center rounded-md text-muted-foreground after:absolute after:-inset-1.5 after:content-[''] hover:bg-muted hover:text-foreground"
          aria-label="Dismiss correction"
        >
          <X aria-hidden="true" size={16} />
        </button>
      </div>

      <div className="space-y-2.5 px-4 py-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">What you wrote</p>
          <p className="mt-0.5 break-keep text-sm text-destructive line-through">{originalText}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground">Corrected</p>
          <p className="mt-0.5 break-keep text-sm font-semibold text-foreground">
            {analysis.correctedText}
          </p>
        </div>

        {showNatural && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">More natural</p>
            <p className="mt-0.5 break-keep text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              {analysis.naturalVersion}
            </p>
          </div>
        )}

        {explanation && <p className="text-sm leading-6 text-muted-foreground">{explanation}</p>}
      </div>

      <div className="flex flex-wrap gap-2 px-4 pb-3.5">
        <Button type="button" size="sm" variant="outline" onClick={onTryAgain}>
          <RotateCcw aria-hidden="true" />
          Try again
        </Button>
        {analysis.usefulVocabulary.length > 0 && (
          <Button type="button" size="sm" onClick={saveVocabulary} disabled={saving || saved}>
            {saved ? <Check aria-hidden="true" /> : <BookmarkPlus aria-hidden="true" />}
            {saved ? "Saved" : saving ? "Saving…" : "Save vocabulary"}
          </Button>
        )}
      </div>
    </motion.div>
  )
}
