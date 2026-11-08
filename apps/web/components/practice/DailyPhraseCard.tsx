"use client"

import { useState } from "react"
import { BookmarkPlus, CheckCircle2, PenLine } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { SpeakButton } from "@/components/ui/SpeakButton"
import { SentenceChallenge } from "@/components/vocab/SentenceChallenge"
import { dailyPhraseApi, getApiErrorMessage } from "@/lib/api"
import type { DailyPhrase } from "@/lib/types"

export function DailyPhraseCard({
  phrase,
  onChange,
}: {
  phrase: DailyPhrase
  onChange: (next: DailyPhrase) => void
}) {
  const [saving, setSaving] = useState(false)
  const [marking, setMarking] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await dailyPhraseApi.addToFlashcards(phrase.id)
      toast.success("Added to your flashcards")
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not save this phrase."))
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkLearned() {
    setMarking(true)
    try {
      const next = !phrase.learned
      await dailyPhraseApi.markLearned(phrase.id, next)
      onChange({ ...phrase, learned: next })
      toast.success(next ? "Marked as learned" : "Marked as not learned")
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not update this phrase."))
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm dark:bg-slate-900/40 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {phrase.formality && (
            <span className="inline-flex rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
              {phrase.formality}
            </span>
          )}
          <div className="mt-4 flex items-center gap-2">
            <h3
              lang="ko"
              className="break-keep text-xl font-bold tracking-tight text-foreground sm:text-2xl"
            >
              {phrase.phrase}
            </h3>
            <SpeakButton text={phrase.phrase} className="shrink-0" />
          </div>
          {phrase.romanization && (
            <p className="mt-1 text-sm font-medium italic text-muted-foreground">
              {phrase.romanization}
            </p>
          )}
          <p className="mt-3 text-base font-bold text-foreground/90">{phrase.meaning}</p>
        </div>
      </div>

      {phrase.whenToUse && (
        <div className="mt-5 rounded-2xl border border-sky-200/60 bg-sky-50/60 p-4 dark:border-sky-400/15 dark:bg-sky-400/6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-400">
            When to use
          </p>
          <p className="mt-1.5 text-sm leading-6 text-sky-800 dark:text-sky-200">
            {phrase.whenToUse}
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={handleMarkLearned}
          disabled={marking}
          className={
            phrase.learned
              ? "h-10 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white hover:bg-blue-500 active:scale-95"
              : "h-10 rounded-xl border border-border bg-background px-5 text-xs font-bold text-foreground hover:bg-accent active:scale-95"
          }
        >
          <CheckCircle2 size={14} className="mr-2" />
          {phrase.learned ? "Learned" : "Mark as learned"}
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={
            justSaved
              ? "h-10 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white active:scale-95"
              : "h-10 rounded-xl border border-border bg-background px-5 text-xs font-bold text-foreground hover:bg-accent active:scale-95"
          }
        >
          {justSaved ? (
            <CheckCircle2 size={14} className="mr-2" />
          ) : (
            <BookmarkPlus size={14} className="mr-2" />
          )}
          {saving ? "Saving..." : justSaved ? "Added" : "Add to flashcards"}
        </Button>
      </div>

      {phrase.similarExpressions && phrase.similarExpressions.length > 0 && (
        <div className="mt-6 space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Similar expressions
          </p>
          {phrase.similarExpressions.map((s, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card px-4 py-3 dark:bg-white/4"
            >
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-foreground">{s.phrase}</p>
                <SpeakButton text={s.phrase} />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{s.meaning}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-background/60 p-5">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <PenLine size={16} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Write it yourself</h4>
            <p className="text-xs font-medium text-muted-foreground">
              Use today&apos;s phrase in your own sentence
            </p>
          </div>
        </div>
        <SentenceChallenge
          cardId={phrase.id}
          term={phrase.phrase}
          onGetChallenge={(id) => dailyPhraseApi.getPractice(id)}
          onCheckSentence={(id, challengePrompt, attempt) =>
            dailyPhraseApi.checkPractice(id, { challengePrompt, attempt })
          }
        />
      </div>
    </div>
  )
}
