"use client"

import Link from "next/link"
import { Archive, MoreVertical, Pencil, Sparkles, Trash2 } from "lucide-react"

import { SpeakButton } from "@/components/ui/SpeakButton"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusBadge } from "@/components/learn/StatusBadge"
import { PhraseRegisterBadge } from "./PhraseRegisterBadge"
import { RevealText } from "./RevealText"
import { situationLabel } from "@/lib/korean-phrasebook/labels"
import { phraseStatus } from "@/lib/learning/course"
import type { PhraseCardWithProgress } from "@/lib/types"
import type { RomanizationMode } from "@/lib/korean-coach/schemas"

export function PhraseCardListItem({
  card,
  romanizationPreference,
  editHref,
  onArchive,
  onDelete,
}: {
  card: PhraseCardWithProgress
  romanizationPreference: RomanizationMode
  editHref?: string
  onArchive?: () => void
  onDelete?: () => void
}) {
  const recommended = card.answers.find((a) => a.isRecommended) ?? card.answers[0]
  const romanizationVisible = romanizationPreference === "always"

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:bg-slate-900/40 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{situationLabel(card.situation)}</Badge>
            {card.provenance === "quoted" || card.provenance === "paraphrased" ? (
              <Badge variant="secondary">
                {card.provenance === "quoted" ? "Your message" : "Your paraphrase"}
              </Badge>
            ) : null}
            <PhraseRegisterBadge register={card.question.register} />
            {/* Shared Learning status words: a due review shows as "Review
                due" instead of a separate red "Due" badge beside the state. */}
            <StatusBadge status={phraseStatus(card.progress)} />
          </div>
          <p
            lang="ko"
            className="break-keep text-lg font-bold leading-snug text-foreground [overflow-wrap:anywhere]"
          >
            {card.question.korean}
          </p>
          {romanizationPreference !== "never" && (
            <RevealText
              label="romanization"
              value={card.question.romanization}
              initiallyVisible={romanizationVisible}
              textClassName="mt-1 text-sm font-medium italic text-muted-foreground"
            />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <SpeakButton
            text={card.question.korean}
            className="bg-accent/10"
            title="Listen to the question"
          />
          {editHref && (
            <Link
              href={editHref}
              aria-label="Edit this Q&A card"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Pencil size={14} />
            </Link>
          )}
          {(onArchive || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More actions"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <MoreVertical size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onArchive && (
                  <DropdownMenuItem onClick={onArchive}>
                    <Archive size={14} className="mr-2" /> Archive
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={onDelete} variant="destructive">
                    <Trash2 size={14} className="mr-2" /> Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
        <RevealText
          label="English"
          value={card.question.english}
          initiallyVisible={false}
          textClassName="text-sm text-muted-foreground"
        />
        {recommended && (
          <RevealText
            label="answer"
            value={`${recommended.korean} — ${recommended.english}`}
            initiallyVisible={false}
            textClassName="rounded-xl bg-emerald-500/5 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400"
          />
        )}
      </div>

      {card.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {card.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-muted-foreground"
            >
              <Sparkles size={10} /> {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
