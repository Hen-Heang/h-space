"use client"

import { CircleCheck, Lightbulb, TriangleAlert } from "lucide-react"
import { RowList } from "@/components/ui/row-list"
import { cn } from "@/lib/utils"
import type { ReviewObservation } from "@/types/finance"

const TONE_ICON = { positive: CircleCheck, warning: TriangleAlert, neutral: Lightbulb } as const
const TONE_CLASS = {
  positive: "text-success",
  warning: "text-warning",
  neutral: "text-muted-foreground",
} as const
// The icon carries the tone visually; this carries it for screen readers.
const TONE_LABEL = { positive: "Good news", warning: "Worth a look", neutral: "Note" } as const

export function ReviewObservations({ observations }: { observations: ReviewObservation[] }) {
  if (observations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No notable changes. Observations appear once spending, budgets, or savings rate shift enough
        month over month.
      </p>
    )
  }

  return (
    <RowList className="border-y border-border">
      {observations.map((observation) => {
        const Icon = TONE_ICON[observation.tone]
        return (
          <li key={observation.id} className="flex items-start gap-3 py-3">
            <Icon
              className={cn("mt-1 size-4 shrink-0", TONE_CLASS[observation.tone])}
              aria-hidden="true"
            />
            <p className="text-base leading-relaxed">
              <span className="sr-only">{TONE_LABEL[observation.tone]}: </span>
              {observation.text}
            </p>
          </li>
        )
      })}
    </RowList>
  )
}
