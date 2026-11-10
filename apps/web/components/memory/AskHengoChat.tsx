"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { ExternalLink, Loader2, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAskHengo } from "@/hooks/useMemory"
import type { AskHengoAnswer } from "@/lib/api"
import { isNotesEnabled } from "@/lib/feature-flags"

const EXAMPLE_QUESTIONS = [
  "What did I complete yesterday?",
  "Which Korean mistakes do I repeat?",
  "What blocked my goals this week?",
  "Summarize my progress this month.",
]

const GROUNDEDNESS_LABEL: Record<
  AskHengoAnswer["groundedness"],
  { label: string; className: string }
> = {
  grounded: { label: "Grounded in your data", className: "text-emerald-600 dark:text-emerald-400" },
  partial: { label: "Partially grounded", className: "text-amber-600 dark:text-amber-400" },
  insufficient: { label: "Not enough data found", className: "text-muted-foreground" },
}

interface Exchange {
  question: string
  answer: AskHengoAnswer
}

export function AskHengoChat() {
  const { ask, asking, error } = useAskHengo()
  const [question, setQuestion] = useState("")
  const [exchanges, setExchanges] = useState<Exchange[]>([])

  async function handleAsk(q: string) {
    const trimmed = q.trim()
    if (!trimmed || asking) return
    setQuestion("")
    const answer = await ask(trimmed)
    if (answer) setExchanges((prev) => [{ question: trimmed, answer }, ...prev])
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleAsk(question)
        }}
        className="space-y-2"
      >
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={
            isNotesEnabled()
              ? "Ask about your notes, goals, habits, journal, or Korean practice…"
              : "Ask about your goals, habits, journal, or Korean practice…"
          }
          className="min-h-20"
          maxLength={500}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleAsk(question)
            }
          }}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={asking || !question.trim()}>
            {asking ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Ask
          </Button>
        </div>
      </form>

      {exchanges.length === 0 && !asking && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Try asking</p>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleAsk(q)}
                className="min-h-11 rounded-full border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-4">
        {exchanges.map((exchange, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2 rounded-lg border border-border bg-card p-4"
          >
            <p className="text-sm font-semibold text-foreground">{exchange.question}</p>
            <p className="text-sm leading-relaxed text-foreground">{exchange.answer.answer}</p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span
                className={`text-xs font-medium ${GROUNDEDNESS_LABEL[exchange.answer.groundedness].className}`}
              >
                {GROUNDEDNESS_LABEL[exchange.answer.groundedness].label}
              </span>
            </div>

            {exchange.answer.sources.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-2">
                {exchange.answer.sources.map((source, si) =>
                  source.href ? (
                    <Link key={si} href={source.href}>
                      <Badge variant="outline" className="gap-1 hover:border-primary/40">
                        {source.title}
                        <ExternalLink size={10} />
                      </Badge>
                    </Link>
                  ) : (
                    <Badge key={si} variant="outline">
                      {source.title}
                    </Badge>
                  ),
                )}
              </div>
            )}

            {exchange.answer.proposedMemories.length > 0 && (
              <p className="border-t border-border/60 pt-2 text-xs text-muted-foreground">
                Noticed {exchange.answer.proposedMemories.length} new thing
                {exchange.answer.proposedMemories.length > 1 ? "s" : ""} worth remembering —{" "}
                <Link
                  href="/ask-hengo/memories"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  review them
                </Link>
                .
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
