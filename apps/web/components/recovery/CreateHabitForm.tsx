"use client"

import { useMemo, useState } from "react"
import { motion } from "motion/react"
import { ArrowLeft, ArrowRight, Check, Compass, LockKeyhole, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { RecoveryTargetInput } from "@/lib/recovery-schemas"
import type { TrackingMode } from "@/lib/types"

const REASONS = [
  "Better focus",
  "Better sleep",
  "More confidence",
  "Improve relationships",
  "Protect work performance",
  "Learn Korean consistently",
  "Improve development skills",
  "Reduce procrastination",
  "Live according to my values",
]

const AFFECTED_AREAS = ["Sleep", "Work", "Learning", "Relationships", "Health", "Time"]

const TRACKING_MODES: Array<{ value: TrackingMode; label: string; description: string }> = [
  {
    value: "abstinence",
    label: "Complete abstinence",
    description: "Track uninterrupted days and every recovery skill.",
  },
  {
    value: "frequency_reduction",
    label: "Frequency reduction",
    description: "Measure fewer occurrences over time.",
  },
  {
    value: "time_reduction",
    label: "Time reduction",
    description: "Focus on reducing time spent.",
  },
  {
    value: "personal_limit",
    label: "Personal limit",
    description: "Choose a private limit that works for you.",
  },
  {
    value: "awareness",
    label: "Awareness only",
    description: "Learn patterns without a pass/fail target.",
  },
]

const STEP_LABELS = ["Goal", "Reason", "Baseline", "Privacy"]

export function CreateHabitForm({
  onCreate,
  onClose,
}: {
  onCreate: (input: RecoveryTargetInput) => Promise<unknown>
  onClose?: () => void
}) {
  const [step, setStep] = useState(0)
  const [label, setLabel] = useState("")
  const [replacementBehavior, setReplacementBehavior] = useState("")
  const [trackingMode, setTrackingMode] = useState<TrackingMode>("awareness")
  const [personalLimit, setPersonalLimit] = useState("")
  const [reasons, setReasons] = useState<string[]>([])
  const [customReason, setCustomReason] = useState("")
  const [statement, setStatement] = useState(
    "I am changing this pattern so I can protect my focus, health, and the life I want to build.",
  )
  const [frequency, setFrequency] = useState("")
  const [frequencyPeriod, setFrequencyPeriod] = useState<"day" | "week" | "month">("week")
  const [commonTime, setCommonTime] = useState("")
  const [commonLocation, setCommonLocation] = useState("")
  const [commonDevice, setCommonDevice] = useState("")
  const [commonEmotion, setCommonEmotion] = useState("")
  const [affectedAreas, setAffectedAreas] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const allReasons = useMemo(
    () => [...reasons, ...(customReason.trim() ? [customReason.trim()] : [])],
    [customReason, reasons],
  )
  const canContinue =
    step === 0 ? Boolean(label.trim()) : step === 1 ? Boolean(statement.trim()) : true

  const toggle = (value: string, values: string[], setValues: (next: string[]) => void) => {
    setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  }

  const handleSubmit = async () => {
    if (!label.trim() || !statement.trim() || submitting) return
    setSubmitting(true)
    try {
      const approximateFrequency = frequency ? Number(frequency) : undefined
      await onCreate({
        label: label.trim(),
        replacementBehavior: replacementBehavior.trim() || undefined,
        trackingMode,
        recoveryStatement: statement.trim(),
        reasons: allReasons,
        personalLimit: personalLimit ? Number(personalLimit) : undefined,
        baseline: {
          approximateFrequency: Number.isFinite(approximateFrequency)
            ? approximateFrequency
            : undefined,
          frequencyPeriod: frequency ? frequencyPeriod : undefined,
          commonTime: commonTime.trim() || undefined,
          commonLocation: commonLocation.trim() || undefined,
          commonDevice: commonDevice.trim() || undefined,
          commonEmotion: commonEmotion.trim() || undefined,
          affectedAreas,
        },
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-lg overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm"
      aria-labelledby="recovery-onboarding-title"
    >
      <div className="border-b border-border/70 px-5 py-5 sm:px-7">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Compass size={19} aria-hidden="true" />
            </span>
            <div>
              <p className="app-kicker">Private setup</p>
              <h2 id="recovery-onboarding-title" className="text-xl font-semibold">
                Build your recovery plan
              </h2>
            </div>
          </div>
          <span className="text-xs font-medium text-muted-foreground">About 2 min</span>
        </div>
        <div
          className="mt-5 grid grid-cols-4 gap-2"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={4}
          aria-valuenow={step + 1}
          aria-label={`Step ${step + 1} of 4: ${STEP_LABELS[step]}`}
        >
          {STEP_LABELS.map((item, index) => (
            <div key={item}>
              <div
                className={cn("h-1.5 rounded-full", index <= step ? "bg-primary" : "bg-muted")}
              />
              <p
                className={cn(
                  "mt-1.5 text-xs font-medium",
                  index === step ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="min-h-[28rem] space-y-5 px-5 py-6 sm:px-7">
        {step === 0 && (
          <motion.div
            key="goal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-5"
          >
            <div>
              <h2 className="text-lg font-semibold">What pattern are you changing?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Use a private label that feels clear to you. Every field stays optional except the
                label.
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="recovery-label" className="text-sm font-medium">
                Private label
              </label>
              <Input
                id="recovery-label"
                autoFocus
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                maxLength={80}
                placeholder="e.g. late-night scrolling"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="tracking-mode" className="text-sm font-medium">
                Tracking mode
              </label>
              <Select
                value={trackingMode}
                onValueChange={(value) => setTrackingMode(value as TrackingMode)}
              >
                <SelectTrigger id="tracking-mode" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRACKING_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {TRACKING_MODES.find((mode) => mode.value === trackingMode)?.description}
              </p>
            </div>
            {trackingMode === "personal_limit" && (
              <div className="space-y-2">
                <label htmlFor="personal-limit" className="text-sm font-medium">
                  Personal limit{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Input
                  id="personal-limit"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={personalLimit}
                  onChange={(event) => setPersonalLimit(event.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="replacement-behavior" className="text-sm font-medium">
                What would you rather do?{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="replacement-behavior"
                value={replacementBehavior}
                onChange={(event) => setReplacementBehavior(event.target.value)}
                maxLength={120}
                placeholder="e.g. put my phone away and read"
              />
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="reason"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-5"
          >
            <div>
              <h2 className="text-lg font-semibold">What are you making room for?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose any reasons that matter. They become part of your visible recovery statement.
              </p>
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Recovery reasons">
              {REASONS.map((reason) => {
                const selected = reasons.includes(reason)
                return (
                  <button
                    key={reason}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggle(reason, reasons, setReasons)}
                    className={cn(
                      "min-h-11 rounded-full border px-3.5 py-2 text-sm transition-colors",
                      selected
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {selected && <Check size={14} className="mr-1.5 inline" aria-hidden="true" />}
                    {reason}
                  </button>
                )
              })}
            </div>
            <div className="space-y-2">
              <label htmlFor="custom-reason" className="text-sm font-medium">
                Custom reason <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="custom-reason"
                value={customReason}
                onChange={(event) => setCustomReason(event.target.value)}
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="recovery-statement" className="text-sm font-medium">
                Recovery statement
              </label>
              <Textarea
                id="recovery-statement"
                value={statement}
                onChange={(event) => setStatement(event.target.value)}
                rows={4}
                maxLength={300}
              />
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="baseline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-5"
          >
            <div>
              <h2 className="text-lg font-semibold">Set an optional baseline</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Skip anything you do not want to record. Approximate answers are enough.
              </p>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-2">
              <div className="space-y-2">
                <label htmlFor="baseline-frequency" className="text-sm font-medium">
                  Approx. frequency
                </label>
                <Input
                  id="baseline-frequency"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={frequency}
                  onChange={(event) => setFrequency(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="frequency-period" className="text-sm font-medium">
                  Per
                </label>
                <Select
                  value={frequencyPeriod}
                  onValueChange={(value) => setFrequencyPeriod(value as typeof frequencyPeriod)}
                >
                  <SelectTrigger id="frequency-period" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="common-time" className="text-sm font-medium">
                  Common time
                </label>
                <Input
                  id="common-time"
                  value={commonTime}
                  onChange={(event) => setCommonTime(event.target.value)}
                  placeholder="e.g. after 11 PM"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="common-location" className="text-sm font-medium">
                  Common location
                </label>
                <Input
                  id="common-location"
                  value={commonLocation}
                  onChange={(event) => setCommonLocation(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="common-device" className="text-sm font-medium">
                  Common device
                </label>
                <Input
                  id="common-device"
                  value={commonDevice}
                  onChange={(event) => setCommonDevice(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="common-emotion" className="text-sm font-medium">
                  Common feeling
                </label>
                <Input
                  id="common-emotion"
                  value={commonEmotion}
                  onChange={(event) => setCommonEmotion(event.target.value)}
                />
              </div>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                Areas affected <span className="font-normal text-muted-foreground">(optional)</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {AFFECTED_AREAS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    aria-pressed={affectedAreas.includes(area)}
                    onClick={() => toggle(area, affectedAreas, setAffectedAreas)}
                    className={cn(
                      "min-h-10 rounded-full border px-3 py-1.5 text-sm",
                      affectedAreas.includes(area)
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </fieldset>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="privacy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-5"
          >
            <div>
              <h2 className="text-lg font-semibold">Private by default</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your records are yours. Here is how this workspace handles them.
              </p>
            </div>
            <div className="space-y-3">
              {[
                [
                  ShieldCheck,
                  "Stored privately",
                  "Recovery records are stored in your Hengo account and protected by owner-only database policies.",
                ],
                [
                  Compass,
                  "Useful without AI",
                  "Rescue, check-ins, plans, and insights work without sending records to a model.",
                ],
                [
                  LockKeyhole,
                  "Discreet controls",
                  "Notifications hide private labels by default. Recovery Lock can be enabled in Privacy Settings.",
                ],
                [
                  ArrowRight,
                  "You stay in control",
                  "Export your records or permanently delete Recovery data from Settings.",
                ],
              ].map(([Icon, title, copy]) => {
                const PrivacyIcon = Icon as typeof ShieldCheck
                return (
                  <div
                    key={String(title)}
                    className="flex gap-3 rounded-2xl border border-border/70 bg-background/70 p-4"
                  >
                    <PrivacyIcon
                      size={18}
                      className="mt-0.5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-sm font-semibold">{String(title)}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{String(copy)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Notes are optional. Avoid entering details you do not need for learning from the
              moment.
            </p>
          </motion.div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border/70 bg-muted/20 px-5 py-4 sm:px-7">
        {step > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setStep((value) => value - 1)}
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        ) : onClose ? (
          <Button type="button" variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
        ) : (
          <span />
        )}
        {step < 3 ? (
          <Button
            type="button"
            size="lg"
            className="ml-auto"
            disabled={!canContinue}
            onClick={() => setStep((value) => value + 1)}
          >
            Continue
            <ArrowRight size={16} />
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className="ml-auto"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Saving…" : "Create private plan"}
          </Button>
        )}
      </div>
    </motion.section>
  )
}
