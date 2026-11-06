"use client"

import { HelpCircle } from "lucide-react"

import { SpeakButton } from "@/components/ui/SpeakButton"

export interface WorkContextView {
  mainPoint?: string
  requiredAction?: string
  conditions?: string[]
  deadline?: string
  expectedResult?: string
  unknowns?: string[]
  clarifyingQuestion?: string
}

// "What I need to do" for a work message — explicit facts only. A missing
// deadline reads "Not stated" (never a guess), and unknowns come with a
// short question to ask. Shared by the analyzer and the work-reply practice.
export function WorkContextSummary({
  context,
  showMainPoint = true,
}: {
  context: WorkContextView
  showMainPoint?: boolean
}) {
  const conditions = context.conditions?.filter(Boolean) ?? []
  const unknowns = context.unknowns?.filter(Boolean) ?? []

  return (
    <div className="space-y-4">
      {showMainPoint && context.mainPoint && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Main point</p>
          <p className="mt-1 text-base font-semibold leading-7 text-foreground">
            {context.mainPoint}
          </p>
        </div>
      )}

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium text-muted-foreground">What to do</dt>
          <dd className="mt-0.5 text-foreground">
            {context.requiredAction || "Nothing is requested — it's information."}
          </dd>
        </div>
        {conditions.length > 0 && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-muted-foreground">Conditions</dt>
            <dd className="mt-0.5">
              <ul className="list-disc space-y-0.5 pl-5 text-foreground">
                {conditions.map((condition) => (
                  <li key={condition}>{condition}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Deadline</dt>
          <dd className="mt-0.5 text-foreground">
            {context.deadline || <span className="text-muted-foreground">Not stated</span>}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Expected result</dt>
          <dd className="mt-0.5 text-foreground">
            {context.expectedResult || <span className="text-muted-foreground">Not stated</span>}
          </dd>
        </div>
      </dl>

      {unknowns.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <HelpCircle aria-hidden="true" className="size-4 text-amber-600" />
            Unclear — ask before you start
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-foreground">
            {unknowns.map((unknown) => (
              <li key={unknown}>{unknown}</li>
            ))}
          </ul>
          {context.clarifyingQuestion && (
            <div className="mt-3 flex items-start justify-between gap-2 rounded-lg bg-background/70 p-2.5">
              <p lang="ko" className="min-w-0 break-keep text-base leading-7 text-foreground">
                {context.clarifyingQuestion}
              </p>
              <SpeakButton
                text={context.clarifyingQuestion}
                className="size-11 shrink-0"
                title="Listen to the question"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
