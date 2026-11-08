"use client"

import { useState } from "react"
import {
  PenLine,
  CheckCircle2,
  XCircle,
  Lightbulb,
  BookOpen,
  ChevronDown,
  Loader2,
  Star,
  RotateCcw,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "@/lib/utils"
import type { SentenceChallengeResponse, SentenceCheckResponse } from "@/lib/types"

type Phase = "idle" | "loading-challenge" | "writing" | "checking" | "result"

type Props = {
  cardId: string
  term: string
  onGetChallenge: (cardId: string) => Promise<SentenceChallengeResponse>
  onCheckSentence: (
    cardId: string,
    challengePrompt: string,
    attempt: string,
  ) => Promise<SentenceCheckResponse>
}

export function SentenceChallenge({ cardId, term, onGetChallenge, onCheckSentence }: Props) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>("idle")
  const [challenge, setChallenge] = useState<SentenceChallengeResponse | null>(null)
  const [attempt, setAttempt] = useState("")
  const [result, setResult] = useState<SentenceCheckResponse | null>(null)
  const [error, setError] = useState("")

  async function handleOpen() {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    if (challenge) {
      setPhase("writing")
      return
    }
    setPhase("loading-challenge")
    setError("")
    try {
      const data = await onGetChallenge(cardId)
      setChallenge(data)
      setPhase("writing")
    } catch {
      setError("Could not load challenge. Please try again.")
      setPhase("idle")
    }
  }

  async function handleCheck() {
    if (!challenge || !attempt.trim()) return
    setPhase("checking")
    setError("")
    try {
      const data = await onCheckSentence(cardId, challenge.challengePrompt, attempt.trim())
      setResult(data)
      setPhase("result")
    } catch {
      setError("Could not evaluate. Please try again.")
      setPhase("writing")
    }
  }

  function handleRetry() {
    setAttempt("")
    setResult(null)
    setPhase("writing")
  }

  function handleNewChallenge() {
    setChallenge(null)
    setAttempt("")
    setResult(null)
    setPhase("loading-challenge")
    setError("")
    onGetChallenge(cardId)
      .then((data) => {
        setChallenge(data)
        setPhase("writing")
      })
      .catch(() => {
        setError("Could not load challenge.")
        setPhase("idle")
      })
  }

  const scoreColor = !result
    ? ""
    : result.score >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : result.score >= 60
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400"

  const scoreBg = !result
    ? ""
    : result.score >= 80
      ? "border-emerald-500/20 bg-emerald-500/5"
      : result.score >= 60
        ? "border-amber-500/20 bg-amber-500/5"
        : "border-red-500/20 bg-red-500/5"

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.99]",
          open
            ? "border-violet-500/30 bg-violet-500/5"
            : "border-border bg-accent/5 hover:border-violet-500/20 hover:bg-violet-500/[0.02]",
        )}
      >
        <div className="flex items-center gap-2.5">
          <PenLine
            size={14}
            className={open ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground/50"}
          />
          <span
            className={cn(
              "text-xs font-bold uppercase tracking-[0.18em]",
              open ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground",
            )}
          >
            Practice Sentence
          </span>
        </div>
        <ChevronDown
          size={14}
          className={cn(
            "text-muted-foreground/40 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3">
              {error && (
                <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-bold text-destructive">
                  {error}
                </p>
              )}

              {phase === "loading-challenge" && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-accent/5 px-4 py-4">
                  <Loader2 size={16} className="animate-spin text-violet-500" />
                  <span className="text-xs font-bold text-muted-foreground">
                    Building your challenge...
                  </span>
                </div>
              )}

              {(phase === "writing" || phase === "checking") && challenge && (
                <div className="space-y-3">
                  {/* Challenge prompt */}
                  <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <BookOpen size={12} className="text-violet-600 dark:text-violet-400" />
                      <span className="text-xs font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                        Task
                      </span>
                    </div>
                    <p className="text-sm font-bold text-foreground leading-relaxed">
                      {challenge.challengePrompt}
                    </p>
                    {challenge.contextHint && (
                      <p className="text-xs font-medium text-muted-foreground/70 italic">
                        {challenge.contextHint}
                      </p>
                    )}
                  </div>

                  {/* Text area */}
                  <textarea
                    value={attempt}
                    onChange={(e) => setAttempt(e.target.value)}
                    disabled={phase === "checking"}
                    placeholder={`Write your Korean sentence using "${term}"…`}
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-base font-medium text-foreground placeholder:text-sm placeholder:text-muted-foreground/40 focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/20 disabled:opacity-60 transition-colors sm:text-sm"
                  />

                  <button
                    type="button"
                    onClick={handleCheck}
                    disabled={!attempt.trim() || phase === "checking"}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500 active:scale-95 disabled:opacity-40"
                  >
                    {phase === "checking" ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Evaluating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} /> Check Answer
                      </>
                    )}
                  </button>
                </div>
              )}

              {phase === "result" && result && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  {/* Score */}
                  <div className={cn("rounded-2xl border p-4 flex items-center gap-4", scoreBg)}>
                    <div className={cn("text-4xl font-bold tabular-nums", scoreColor)}>
                      {result.score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {result.correct ? (
                          <CheckCircle2
                            size={14}
                            className="text-emerald-600 dark:text-emerald-400"
                          />
                        ) : (
                          <XCircle size={14} className="text-red-600 dark:text-red-400" />
                        )}
                        <span
                          className={cn("text-xs font-bold uppercase tracking-wide", scoreColor)}
                        >
                          {result.correct ? "Good job" : "Keep practicing"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-muted-foreground/80 leading-relaxed">
                        {result.feedback}
                      </p>
                    </div>
                  </div>

                  {/* Corrected / Better */}
                  {result.correctedSentence && result.correctedSentence !== attempt.trim() && (
                    <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3 space-y-1">
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-400">
                        Corrected
                      </span>
                      <p className="text-sm font-bold text-foreground">
                        {result.correctedSentence}
                      </p>
                    </div>
                  )}

                  {result.betterAlternative && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Star size={11} className="text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
                          More natural
                        </span>
                      </div>
                      <p className="text-sm font-bold text-foreground">
                        {result.betterAlternative}
                      </p>
                    </div>
                  )}

                  {result.grammarNote && (
                    <div className="flex items-start gap-2.5 rounded-2xl border border-border bg-accent/5 p-3">
                      <Lightbulb size={13} className="mt-0.5 shrink-0 text-muted-foreground/50" />
                      <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed">
                        {result.grammarNote}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-border bg-background py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground transition-all hover:bg-accent active:scale-95"
                    >
                      <RotateCcw size={12} /> Try again
                    </button>
                    <button
                      type="button"
                      onClick={handleNewChallenge}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-violet-600 py-3 text-xs font-bold uppercase tracking-wide text-white shadow-md shadow-violet-600/20 transition-all hover:bg-violet-500 active:scale-95"
                    >
                      <PenLine size={12} /> New challenge
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
