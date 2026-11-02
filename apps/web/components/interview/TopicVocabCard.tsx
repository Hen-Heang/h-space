"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BookOpen } from "lucide-react"

import { Button } from "@/components/ui/button"
import { vocabApi } from "@/lib/api"
import { INTERVIEW_VOCAB_SEED } from "@/lib/interview-vocab-seed"

// The topic's starter vocabulary, loaded into the existing kori_vocab_cards
// deck (lib/api/vocab.ts) and practiced on /vocab. Formerly part of
// InterviewProgressCard, whose practice stats now live in ExamProgressCard.
export function TopicVocabCard() {
  const [vocabLoaded, setVocabLoaded] = useState<number | null>(null)
  const [isSeedingVocab, setIsSeedingVocab] = useState(false)
  const [seedFailed, setSeedFailed] = useState(false)

  useEffect(() => {
    let active = true
    vocabApi
      .getSavedWords()
      .then((words) => {
        if (!active) return
        const loadedTerms = new Set(words.map((w) => w.term))
        setVocabLoaded(INTERVIEW_VOCAB_SEED.filter((v) => loadedTerms.has(v.term)).length)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  async function loadStarterVocab() {
    setIsSeedingVocab(true)
    setSeedFailed(false)
    try {
      const existing = await vocabApi.getSavedWords()
      const existingTerms = new Set(existing.map((w) => w.term))
      const missing = INTERVIEW_VOCAB_SEED.filter((v) => !existingTerms.has(v.term))
      for (const item of missing) {
        await vocabApi.save({
          category: item.category,
          term: item.term,
          meaning: item.meaning,
          example: item.example,
        })
      }
      setVocabLoaded(INTERVIEW_VOCAB_SEED.length)
    } catch {
      // The button stays visible so the candidate can retry.
      setSeedFailed(true)
    } finally {
      setIsSeedingVocab(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/20 p-4">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <BookOpen aria-hidden="true" className="size-4" /> Topic vocabulary
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {vocabLoaded === null
            ? "Checking your vocabulary deck…"
            : `${vocabLoaded} of ${INTERVIEW_VOCAB_SEED.length} starter words are in your vocabulary deck`}
        </p>
        {seedFailed && (
          <p role="alert" className="mt-1 text-xs text-destructive">
            Couldn&apos;t add every word. Try again.
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {vocabLoaded !== null && vocabLoaded < INTERVIEW_VOCAB_SEED.length && (
          <Button size="sm" onClick={loadStarterVocab} disabled={isSeedingVocab} className="h-10">
            {isSeedingVocab ? "Adding…" : "Add starter words"}
          </Button>
        )}
        <Button asChild size="sm" variant="outline" className="h-10">
          <Link href="/vocab">Open Vocabulary</Link>
        </Button>
      </div>
    </div>
  )
}
