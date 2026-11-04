"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ArrowLeft, ArrowRight, Check, Pause, Play, RotateCcw, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { UrgeEventInput } from "@/lib/recovery-schemas"
import type { ProtectionItem, RecoveryEvent, RecoveryHabit, RecoveryTrigger } from "@/lib/types"

const TOTAL_SECONDS = 90
const EMOTIONS = [
  "Bored",
  "Lonely",
  "Stressed",
  "Tired",
  "Angry",
  "Anxious",
  "Rejected",
  "Overwhelmed",
  "Unable to sleep",
  "Procrastinating",
]
const LOCATIONS = ["Bedroom", "Living room", "Desk", "Bathroom", "Outside", "Workplace"]
const DEVICES = ["Phone", "Computer", "Tablet", "TV", "No device"]
const DEFAULT_ACTIONS = [
  "Stand up and leave the room",
  "Put the phone in another room",
  "Go to a shared space",
  "Drink water",
  "Take a short walk",
  "Open a Korean micro-lesson",
  "Start a five-minute task",
  "Contact a support person",
  "Begin bedtime mode",
]

type Stage = "pause" | "name" | "surf" | "environment" | "replacement" | "result" | "complete"
type Result = "passed" | "weaker" | "managing" | "healthy_action" | "slip"
const STAGES: Stage[] = ["pause", "name", "surf", "environment", "replacement", "result"]

function recommendation({
  emotion,
  selectedAction,
  target,
  goals,
}: {
  emotion?: string
  selectedAction?: string
  target: RecoveryHabit
  goals: string[]
}) {
  const hour = new Date().getHours()
  if (selectedAction) return selectedAction
  if (hour >= 23 || hour < 6 || emotion === "Tired" || emotion === "Unable to sleep")
    return "Put your phone outside the bedroom and begin a ten-minute sleep routine."
  if (emotion === "Bored") return "Open Hengo and complete one five-minute Korean review."
  if (emotion === "Stressed" || emotion === "Overwhelmed" || emotion === "Procrastinating")
    return goals[0]
      ? `Start a five-minute version of “${goals[0]}”.`
      : "Start a five-minute version of your current priority task."
  if (target.replacementBehavior) return target.replacementBehavior
  return "Take a ten-minute walk, then recheck the urge before making another decision."
}

export function UrgeRescueFlow({
  target,
  triggers,
  protectionItems,
  goals,
  onSave,
}: {
  target: RecoveryHabit
  triggers: RecoveryTrigger[]
  protectionItems: ProtectionItem[]
  goals: string[]
  onSave: (input: UrgeEventInput) => Promise<RecoveryEvent>
}) {
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const stageFocusRef = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState<Stage>("pause")
  const [remaining, setRemaining] = useState(TOTAL_SECONDS)
  const [running, setRunning] = useState(true)
  const [intensity, setIntensity] = useState(5)
  const [afterIntensity, setAfterIntensity] = useState(5)
  const [emotion, setEmotion] = useState<string>()
  const [location, setLocation] = useState<string>()
  const [device, setDevice] = useState<string>()
  const [triggerId, setTriggerId] = useState<string>()
  const [situation, setSituation] = useState("")
  const [selectedAction, setSelectedAction] = useState<string>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (stage !== "pause" || !running || remaining <= 0) return
    const id = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(id)
  }, [remaining, running, stage])

  useEffect(() => {
    if (remaining === 0 && stage === "pause") setRunning(false)
  }, [remaining, stage])

  useEffect(() => {
    stageFocusRef.current?.focus()
  }, [stage])

  const actions = useMemo(
    () =>
      [
        ...protectionItems
          .filter((item) => item.preferredAction || item.status === "active")
          .map((item) => item.label),
        ...DEFAULT_ACTIONS,
      ].filter((action, index, list) => list.indexOf(action) === index),
    [protectionItems],
  )
  const suggestedAction = recommendation({ emotion, selectedAction, target, goals })
  const stageIndex = STAGES.indexOf(stage)
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  const next = () => {
    const index = STAGES.indexOf(stage)
    if (index >= 0 && index < STAGES.length - 1) setStage(STAGES[index + 1])
  }
  const back = () => {
    const index = STAGES.indexOf(stage)
    if (index > 0) setStage(STAGES[index - 1])
    else router.push("/growth/recovery")
  }

  const finish = async (result: Result) => {
    if (saving) return
    setSaving(true)
    try {
      const isSlip = result === "slip"
      const managed = result === "passed" || result === "weaker" || result === "healthy_action"
      const event = await onSave({
        kind: isSlip ? "slip" : managed ? "win" : "moment",
        intensity,
        triggerId,
        emotion,
        location,
        device,
        situation: situation.trim() || undefined,
        actionTaken: suggestedAction,
        healthyActionCompleted: result === "healthy_action",
        rodeOut: isSlip ? false : managed ? true : undefined,
        resolvedAt: new Date().toISOString(),
      })
      if (isSlip) {
        sessionStorage.setItem(
          "hengo-recovery-debrief",
          JSON.stringify({ eventId: event.id, habitId: target.id }),
        )
        router.push("/growth/recovery/debrief")
        return
      }
      setStage("complete")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex min-h-[100dvh] flex-col overflow-y-auto bg-slate-950 text-white">
      <header className="safe-top sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-950/95 px-4 pb-3 backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={back}
          className="flex size-11 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div
          className="flex items-center gap-1.5"
          aria-label={`Rescue stage ${Math.max(1, stageIndex + 1)} of ${STAGES.length}`}
        >
          {STAGES.map((item, index) => (
            <span
              key={item}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === stageIndex
                  ? "w-6 bg-blue-400"
                  : index < stageIndex
                    ? "w-2 bg-blue-400/50"
                    : "w-2 bg-white/15",
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => router.push("/growth/recovery")}
          className="flex size-11 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Exit Urge Rescue"
        >
          <X size={20} />
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-8 sm:px-8 sm:py-10">
        <div ref={stageFocusRef} tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
          <AnimatePresence mode="wait">
            {stage === "pause" && (
              <motion.section
                key="pause"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-1 flex-col items-center justify-center text-center"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
                  Pause
                </p>
                <h1 className="mt-3 max-w-md text-2xl font-semibold text-white sm:text-3xl">
                  You do not need to decide right now.
                </h1>
                <p className="mt-2 text-sm text-white/55">Let&apos;s wait for 90 seconds.</p>
                <div
                  className="relative mt-10 flex size-60 items-center justify-center"
                  aria-label={`${remaining} seconds remaining`}
                >
                  <motion.div
                    className="absolute inset-4 rounded-full bg-blue-400/10 ring-1 ring-blue-300/25"
                    animate={
                      reduceMotion || !running
                        ? undefined
                        : { scale: [0.78, 1, 0.78], opacity: [0.45, 0.9, 0.45] }
                    }
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <div className="absolute inset-0 rounded-full border border-white/10" />
                  <div
                    aria-live="polite"
                    className="relative font-mono text-4xl font-semibold tabular-nums"
                  >
                    {minutes}:{seconds.toString().padStart(2, "0")}
                  </div>
                </div>
                <p className="mt-5 text-sm text-white/55">
                  {running
                    ? "Breathe slowly. Let your shoulders drop."
                    : remaining === 0
                      ? "You created a pause. Continue when you are ready."
                      : "Timer paused."}
                </p>
                <div className="mt-8 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                    onClick={() => setRunning((value) => !value)}
                    disabled={remaining === 0}
                  >
                    {running ? <Pause size={17} /> : <Play size={17} />}
                    {running ? "Pause" : "Resume"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-white/70 hover:bg-white/10 hover:text-white"
                    onClick={() => {
                      setRemaining(TOTAL_SECONDS)
                      setRunning(true)
                    }}
                  >
                    <RotateCcw size={17} />
                    Restart
                  </Button>
                </div>
                <Button
                  type="button"
                  size="lg"
                  className="mt-8 min-h-12 min-w-48 bg-white text-slate-950 hover:bg-white/90"
                  onClick={next}
                >
                  {remaining === 0 ? "Continue" : "Continue now"}
                  <ArrowRight size={17} />
                </Button>
              </motion.section>
            )}

            {stage === "name" && (
              <motion.section
                key="name"
                initial={{ opacity: 0, x: reduceMotion ? 0 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-7"
              >
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
                    Name the urge
                  </p>
                  <h1 className="mt-3 text-2xl font-semibold text-white">Notice what is here.</h1>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Skip any question. Useful patterns do not require private detail.
                  </p>
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <label htmlFor="urge-intensity" className="font-medium">
                      How strong is it?
                    </label>
                    <span className="font-mono text-blue-300">{intensity}/10</span>
                  </div>
                  <input
                    id="urge-intensity"
                    type="range"
                    min="1"
                    max="10"
                    value={intensity}
                    onChange={(event) => setIntensity(Number(event.target.value))}
                    className="mt-4 h-11 w-full accent-blue-400"
                    aria-valuetext={`${intensity} out of 10`}
                  />
                </div>
                <ChoiceGroup
                  label="What are you feeling?"
                  options={EMOTIONS}
                  value={emotion}
                  onChange={setEmotion}
                />
                <ChoiceGroup
                  label="Where are you?"
                  options={LOCATIONS}
                  value={location}
                  onChange={setLocation}
                />
                <ChoiceGroup
                  label="Which device are you using?"
                  options={DEVICES}
                  value={device}
                  onChange={setDevice}
                />
                {triggers.length > 0 && (
                  <ChoiceGroup
                    label="What happened before the urge?"
                    options={triggers.map((trigger) => trigger.label)}
                    value={triggers.find((trigger) => trigger.id === triggerId)?.label}
                    onChange={(label) =>
                      setTriggerId(triggers.find((trigger) => trigger.label === label)?.id)
                    }
                  />
                )}
                <div className="space-y-2">
                  <label htmlFor="urge-situation" className="text-sm font-medium">
                    One short context note{" "}
                    <span className="font-normal text-white/45">(optional)</span>
                  </label>
                  <Input
                    id="urge-situation"
                    value={situation}
                    onChange={(event) => setSituation(event.target.value)}
                    maxLength={160}
                    placeholder="e.g. after a difficult task"
                    className="h-12 border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  />
                </div>
                <Button
                  type="button"
                  size="lg"
                  className="min-h-12 w-full bg-white text-slate-950 hover:bg-white/90"
                  onClick={next}
                >
                  Continue
                  <ArrowRight size={17} />
                </Button>
              </motion.section>
            )}

            {stage === "surf" && (
              <motion.section
                key="surf"
                initial={{ opacity: 0, x: reduceMotion ? 0 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-7"
              >
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
                    Urge surfing
                  </p>
                  <h1 className="mt-3 text-2xl font-semibold text-white">
                    Watch the wave without fighting it.
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    It may rise, fall, or stay strong for a while. You are practicing observation,
                    not forcing it away.
                  </p>
                </div>
                <ol className="space-y-3">
                  {[
                    "Notice where the urge appears in your body.",
                    "Observe the sensation without judging it.",
                    "Take five slow breaths.",
                    "Picture the intensity as a wave that can change.",
                    "Delay the decision for another ten minutes.",
                  ].map((item, index) => (
                    <li
                      key={item}
                      className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/75"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-400/15 font-mono text-xs text-blue-300">
                        {index + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>
                <div>
                  <div className="flex justify-between text-sm">
                    <label htmlFor="urge-intensity-after" className="font-medium">
                      Rate it again
                    </label>
                    <span className="font-mono text-blue-300">{afterIntensity}/10</span>
                  </div>
                  <input
                    id="urge-intensity-after"
                    type="range"
                    min="1"
                    max="10"
                    value={afterIntensity}
                    onChange={(event) => setAfterIntensity(Number(event.target.value))}
                    className="mt-4 h-11 w-full accent-blue-400"
                  />
                </div>
                <Button
                  type="button"
                  size="lg"
                  className="min-h-12 w-full bg-white text-slate-950 hover:bg-white/90"
                  onClick={next}
                >
                  Change my environment
                  <ArrowRight size={17} />
                </Button>
              </motion.section>
            )}

            {stage === "environment" && (
              <motion.section
                key="environment"
                initial={{ opacity: 0, x: reduceMotion ? 0 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-7"
              >
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
                    Change the environment
                  </p>
                  <h1 className="mt-3 text-2xl font-semibold text-white">
                    Choose one action you can do now.
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    A small physical change makes the next choice easier.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {actions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      aria-pressed={selectedAction === action}
                      onClick={() => setSelectedAction(action)}
                      className={cn(
                        "flex min-h-14 items-center gap-3 rounded-2xl border p-3.5 text-left text-sm transition-colors",
                        selectedAction === action
                          ? "border-blue-300/40 bg-blue-400/15 text-white"
                          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border",
                          selectedAction === action
                            ? "border-blue-300 bg-blue-300 text-slate-950"
                            : "border-white/20",
                        )}
                      >
                        {selectedAction === action && <Check size={14} />}
                      </span>
                      {action}
                    </button>
                  ))}
                </div>
                <Button
                  type="button"
                  size="lg"
                  className="min-h-12 w-full bg-white text-slate-950 hover:bg-white/90"
                  disabled={!selectedAction}
                  onClick={next}
                >
                  Use this action
                  <ArrowRight size={17} />
                </Button>
              </motion.section>
            )}

            {stage === "replacement" && (
              <motion.section
                key="replacement"
                initial={{ opacity: 0, x: reduceMotion ? 0 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-1 flex-col justify-center"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
                  Your next small action
                </p>
                <div className="mt-5 rounded-3xl border border-blue-300/20 bg-blue-400/10 p-6 sm:p-8">
                  <p className="text-xl font-medium leading-8 text-white">{suggestedAction}</p>
                  <p className="mt-4 text-sm leading-6 text-white/55">
                    Give it five minutes, then check the urge again. You can choose another action
                    if this one does not fit.
                  </p>
                </div>
                <Button
                  type="button"
                  size="lg"
                  className="mt-8 min-h-12 w-full bg-white text-slate-950 hover:bg-white/90"
                  onClick={next}
                >
                  I&apos;m ready
                  <ArrowRight size={17} />
                </Button>
              </motion.section>
            )}

            {stage === "result" && (
              <motion.section
                key="result"
                initial={{ opacity: 0, x: reduceMotion ? 0 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-7"
              >
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
                    Result
                  </p>
                  <h1 className="mt-3 text-2xl font-semibold text-white">Where are you now?</h1>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Choose the honest answer. Every answer helps the next plan.
                  </p>
                </div>
                <div className="space-y-2">
                  {[
                    ["passed", "Urge passed"],
                    ["weaker", "Urge became weaker"],
                    ["managing", "Still managing it"],
                    ["healthy_action", "I completed a healthy action"],
                    ["slip", "I had a slip"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      disabled={saving}
                      onClick={() => finish(value as Result)}
                      className="min-h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-left text-sm font-medium text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </motion.section>
            )}

            {stage === "complete" && (
              <motion.section
                key="complete"
                initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-1 flex-col items-center justify-center text-center"
              >
                <span className="flex size-16 items-center justify-center rounded-full bg-blue-400/15 text-blue-300">
                  <Check size={28} />
                </span>
                <h1 className="mt-6 max-w-sm text-2xl font-semibold text-white">
                  You created space between the urge and your action.
                </h1>
                <p className="mt-3 max-w-sm text-sm leading-6 text-white/55">
                  That is real progress. Your result has been added to your private insights.
                </p>
                <Button
                  type="button"
                  size="lg"
                  className="mt-8 min-h-12 bg-white text-slate-950 hover:bg-white/90"
                  onClick={() => router.push("/growth/recovery")}
                >
                  Continue recovery
                </Button>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

function ChoiceGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value?: string
  onChange: (value: string | undefined) => void
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(value === option ? undefined : option)}
            className={cn(
              "min-h-11 rounded-full border px-3.5 py-2 text-sm transition-colors",
              value === option
                ? "border-blue-300/40 bg-blue-400/15 text-white"
                : "border-white/10 bg-white/5 text-white/60 hover:text-white",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
