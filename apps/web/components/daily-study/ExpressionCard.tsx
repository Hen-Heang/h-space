"use client"

import { BriefcaseBusiness, MapPin } from "lucide-react"

import { SpeakButton } from "@/components/ui/SpeakButton"
import type { DailyStudyExpression } from "@/lib/daily-study-plan"

export function ExpressionCard({
  expression,
  showRomanization,
}: {
  expression: DailyStudyExpression
  showRomanization: boolean
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            lang="ko"
            className="break-keep text-lg font-semibold leading-snug [overflow-wrap:anywhere]"
          >
            {expression.korean}
          </p>
          {showRomanization && (
            <p className="mt-1 break-words text-xs font-medium text-blue-600 dark:text-blue-400">
              {expression.romanization}
            </p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">{expression.english}</p>
        </div>
        <SpeakButton
          text={expression.korean}
          className="min-h-11 min-w-11 shrink-0"
          title={`Listen to ${expression.korean}`}
        />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{expression.usageNote}</p>
      <div className="mt-3 rounded-xl bg-muted/55 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p lang="ko" className="break-keep text-sm font-medium [overflow-wrap:anywhere]">
              {expression.example}
            </p>
            {showRomanization && (
              <p className="mt-1 break-words text-xs text-blue-700 dark:text-blue-300">
                {expression.exampleRomanization}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{expression.exampleEnglish}</p>
          </div>
          <SpeakButton text={expression.example} className="min-h-10 min-w-10 shrink-0" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
        <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-blue-700 dark:text-blue-300">
          {expression.difficulty}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
          {expression.category === "workplace" ? (
            <BriefcaseBusiness size={12} />
          ) : (
            <MapPin size={12} />
          )}
          {expression.category === "workplace" ? "Workplace" : "Daily life"}
        </span>
      </div>
    </article>
  )
}
