"use client"

import {
  ArrowRight,
  BookmarkCheck,
  BookmarkPlus,
  CheckCircle2,
  Clock,
  Languages,
  Lightbulb,
  Loader2,
  MessageSquare,
  RotateCcw,
  Sparkles,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { VoiceSessionReport } from "@/lib/realtime/session-report"
import { cn } from "@/lib/utils"

type VocabSaveState = "idle" | "saving" | "saved"

type VoiceSessionReportProps = {
  report: VoiceSessionReport
  onClose: () => void
  onPracticeAgain: () => void
  onReviewCorrections: () => void
  onStartRecommended: () => void
  onSaveVocabulary: () => void
  vocabState: VocabSaveState
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const rem = seconds % 60
  return rem ? `${mins}m ${rem}s` : `${mins}m`
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl border border-border/60 bg-muted/30 px-2 py-3 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-lg font-bold leading-none text-foreground">{value}</span>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

export function VoiceSessionReport({
  report,
  onClose,
  onPracticeAgain,
  onReviewCorrections,
  onStartRecommended,
  onSaveVocabulary,
  vocabState,
}: VoiceSessionReportProps) {
  const { metrics } = report

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="space-y-1 border-b border-border/50 bg-gradient-to-b from-blue-500/[0.06] to-transparent px-5 pt-5 pb-4 text-left">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/12 text-blue-600 dark:text-blue-400">
              <Sparkles size={16} />
            </span>
            <DialogTitle className="text-lg font-bold tracking-tight">
              Speaking session summary
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            {report.scenarioTitle
              ? `Scenario: ${report.scenarioTitle}`
              : "Here's how your live Korean practice went."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Honest, measured stats — no invented pronunciation score. */}
          <div className="flex gap-2">
            <Stat
              icon={<Clock size={15} />}
              value={formatDuration(metrics.durationSeconds)}
              label="Time"
            />
            <Stat
              icon={<MessageSquare size={15} />}
              value={String(metrics.userTurnCount)}
              label="Your turns"
            />
            <Stat
              icon={<Languages size={15} />}
              value={`~${metrics.approxWordCount}`}
              label="KO words"
            />
          </div>

          {report.scenarioTitle && report.scenarioCompleted !== null && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold",
                report.scenarioCompleted
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
              )}
            >
              <CheckCircle2 size={16} />
              {report.scenarioCompleted ? "Scenario goal reached" : "Scenario goal not reached yet"}
            </div>
          )}

          {report.strengths.length > 0 && (
            <section className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                What went well
              </h4>
              <ul className="space-y-1.5">
                {report.strengths.map((strength, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs leading-relaxed text-foreground/90"
                  >
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                    {strength}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {report.corrections.length > 0 && (
            <section className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Key corrections ({report.corrections.length})
              </h4>
              <div className="space-y-2">
                {report.corrections.map((correction, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-border/60 bg-muted/20 px-3.5 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className="text-muted-foreground line-through" lang="ko">
                        {correction.original}
                      </span>
                      <ArrowRight size={12} className="text-muted-foreground" />
                      <span className="font-bold text-foreground" lang="ko">
                        {correction.corrected}
                      </span>
                    </div>
                    {correction.natural && correction.natural !== correction.corrected && (
                      <p className="mt-1 text-xs text-blue-600 dark:text-blue-400" lang="ko">
                        자연스럽게: {correction.natural}
                      </p>
                    )}
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {correction.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {report.vocabulary.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Useful expressions
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onSaveVocabulary}
                  disabled={vocabState !== "idle"}
                  className="h-7 gap-1.5 rounded-full px-2.5 text-xs font-bold text-blue-600 dark:text-blue-400"
                >
                  {vocabState === "saving" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : vocabState === "saved" ? (
                    <BookmarkCheck size={12} />
                  ) : (
                    <BookmarkPlus size={12} />
                  )}
                  {vocabState === "saved" ? "Saved" : "Save all"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {report.vocabulary.map((vocab, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    <span lang="ko" className="font-bold">
                      {vocab.korean}
                    </span>
                    <span className="text-muted-foreground"> · {vocab.english}</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-blue-500/25 bg-blue-500/[0.07] px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
              <Lightbulb size={13} />
              Recommended next
            </div>
            <p className="mt-1 text-xs font-bold text-foreground">
              {report.recommendedPractice.label}
            </p>
            <p className="text-xs text-muted-foreground">{report.recommendedPractice.reason}</p>
          </section>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border/50 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="outline"
            onClick={onPracticeAgain}
            className="h-11 gap-1.5 rounded-xl text-xs font-bold"
          >
            <RotateCcw size={15} />
            Practice again
          </Button>
          {report.corrections.length > 0 ? (
            <Button
              type="button"
              onClick={onReviewCorrections}
              className="h-11 gap-1.5 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-500"
            >
              Review corrections
              <ArrowRight size={15} />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onStartRecommended}
              className="h-11 gap-1.5 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-500"
            >
              {report.recommendedPractice.label}
              <ArrowRight size={15} />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
