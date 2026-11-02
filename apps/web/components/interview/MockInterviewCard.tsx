"use client"

import { useId } from "react"
import { AlertCircle, GraduationCap, Loader2 } from "lucide-react"

import { ModePicker } from "@/components/interview/ModePicker"
import { Button } from "@/components/ui/button"
import type { InterviewMode } from "@/lib/interview-modes"

/** One Mock Interview feature with two modes: Practice and Exam Simulation. */
export function MockInterviewCard({
  mode,
  onModeChange,
  onStart,
  starting,
  error,
}: {
  mode: InterviewMode
  onModeChange: (mode: InterviewMode) => void
  onStart: () => void
  starting: boolean
  error: string
}) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="app-surface flex flex-col gap-4 p-5 sm:p-6">
      <div>
        <h2 id={headingId} className="flex items-center gap-2 text-base font-semibold">
          <GraduationCap aria-hidden="true" className="size-4 text-primary" />
          Mock interview
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          An AI examiner asks one question at a time and follows up on your answers.
        </p>
      </div>

      <ModePicker value={mode} onChange={onModeChange} />

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <Button
        size="lg"
        variant="outline"
        onClick={onStart}
        disabled={starting}
        className="mt-auto h-12 w-full"
      >
        {starting ? (
          <>
            <Loader2 aria-hidden="true" className="animate-spin" /> Starting…
          </>
        ) : mode === "exam" ? (
          "Start exam simulation"
        ) : (
          "Start practice interview"
        )}
      </Button>
    </section>
  )
}
