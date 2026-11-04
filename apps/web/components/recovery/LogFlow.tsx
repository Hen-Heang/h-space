"use client"

import { useState } from "react"
import { motion } from "motion/react"

import { ChipSelect } from "@/components/ui/chip-select"
import { cn } from "@/lib/utils"
import type { RecoveryEventKind, RecoveryTrigger } from "@/lib/types"

// Fixed, domain-neutral emotion vocabulary — no free text on the happy path,
// so logging never needs a keyboard.
const EMOTIONS = ["Bored", "Stressed", "Tired", "Anxious", "Lonely", "Restless", "Calm"]

type Outcome = { kind: RecoveryEventKind; rodeOut?: boolean; label: string }

const OUTCOMES: Outcome[] = [
  { kind: "win", rodeOut: true, label: "Rode it out" },
  { kind: "moment", label: "Just checking in" },
  { kind: "slip", rodeOut: false, label: "It happened" },
]

type Step = "intensity" | "trigger" | "emotion" | "outcome"
const STEPS: Step[] = ["intensity", "trigger", "emotion", "outcome"]

export function LogFlow({
  triggers,
  onSubmit,
}: {
  triggers: RecoveryTrigger[]
  onSubmit: (input: {
    intensity: number
    triggerId?: string
    emotion?: string
    kind: RecoveryEventKind
    rodeOut?: boolean
  }) => Promise<void>
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [intensity, setIntensity] = useState<number | null>(null)
  const [triggerId, setTriggerId] = useState<string | undefined>(undefined)
  const [emotion, setEmotion] = useState<string | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)

  const step = STEPS[stepIndex]
  const advance = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))

  const handleOutcome = async (outcome: Outcome) => {
    if (intensity == null || submitting) return
    setSubmitting(true)
    try {
      await onSubmit({
        intensity,
        triggerId,
        emotion,
        kind: outcome.kind,
        rodeOut: outcome.rodeOut,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-full min-h-[70dvh] flex-col">
      {/* Step dots — top, out of the way of thumbs */}
      <div className="flex items-center justify-center gap-1.5 pt-2">
        {STEPS.map((s) => (
          <div
            key={s}
            className={cn(
              "h-1.5 rounded-full transition-all",
              s === step ? "w-6 bg-blue-600" : "w-1.5 bg-border",
            )}
          />
        ))}
      </div>

      {/* Controls anchored to the bottom of the screen for one-handed reach */}
      <div className="mt-auto flex flex-col gap-6 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-10 sm:px-6">
        {step === "intensity" && (
          <motion.div
            key="intensity"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <p className="text-center text-sm font-semibold text-muted-foreground">
              How strong is it right now?
            </p>
            {/* Five equal squares that shrink to fit: five fixed 56px buttons
                with 12px gaps were 328px and ran off a 320px screen. */}
            <div className="mx-auto grid max-w-sm grid-cols-5 gap-2 sm:gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setIntensity(n)
                    advance()
                  }}
                  className={cn(
                    "flex aspect-square min-h-11 w-full items-center justify-center rounded-2xl border text-lg font-bold transition-all active:scale-95",
                    intensity === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-accent",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === "trigger" && (
          <motion.div
            key="trigger"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <p className="text-center text-sm font-semibold text-muted-foreground">
              What led up to it?
            </p>
            <ChipSelect
              className="justify-center"
              options={[...triggers.map((t) => t.label), "Skip"]}
              value={triggers.find((t) => t.id === triggerId)?.label ?? ""}
              onChange={(label) => {
                setTriggerId(
                  label === "Skip" ? undefined : triggers.find((t) => t.label === label)?.id,
                )
                advance()
              }}
            />
          </motion.div>
        )}

        {step === "emotion" && (
          <motion.div
            key="emotion"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <p className="text-center text-sm font-semibold text-muted-foreground">
              What are you feeling?
            </p>
            <ChipSelect
              className="justify-center"
              options={[...EMOTIONS, "Skip"]}
              value={emotion ?? ""}
              onChange={(value) => {
                setEmotion(value === "Skip" ? undefined : value)
                advance()
              }}
            />
          </motion.div>
        )}

        {step === "outcome" && (
          <motion.div
            key="outcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <p className="text-center text-sm font-semibold text-muted-foreground">
              What happened?
            </p>
            {OUTCOMES.map((outcome) => (
              <button
                key={outcome.label}
                type="button"
                disabled={submitting}
                onClick={() => handleOutcome(outcome)}
                className={cn(
                  "w-full rounded-2xl border px-5 py-4 text-left text-sm font-semibold transition-all active:scale-[0.99]",
                  outcome.kind === "slip"
                    ? "border-amber-500/30 bg-amber-500/5 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
                    : "border-border bg-card text-foreground hover:bg-accent",
                  submitting && "pointer-events-none opacity-50",
                )}
              >
                {outcome.label}
              </button>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
