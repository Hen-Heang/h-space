"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Moon, Sparkles, Sunrise } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { DailyCheckInInput } from "@/lib/recovery-schemas"
import type { DailyCheckInPeriod } from "@/lib/types"

const MOODS = ["Calm", "Good", "Okay", "Low", "Tense"]
const COPING = [
  "Pause",
  "Changed environment",
  "Walked",
  "Korean practice",
  "Started a task",
  "Reached out",
  "Sleep routine",
]

function localDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

export function DailyCheckInForm({
  healthyHabits,
  onSave,
}: {
  healthyHabits: string[]
  onSave: (input: DailyCheckInInput) => Promise<void>
}) {
  const [period, setPeriod] = useState<DailyCheckInPeriod>(
    new Date().getHours() < 15 ? "morning" : "evening",
  )
  const [mood, setMood] = useState("")
  const [sleepQuality, setSleepQuality] = useState<number>()
  const [energy, setEnergy] = useState<number>()
  const [stress, setStress] = useState<number>()
  const [riskLevel, setRiskLevel] = useState<number>()
  const [importantGoal, setImportantGoal] = useState("")
  const [protectionAction, setProtectionAction] = useState("")
  const [intention, setIntention] = useState("")
  const [currentUrge, setCurrentUrge] = useState<number>()
  const [strongestUrge, setStrongestUrge] = useState<number>()
  const [copingStrategy, setCopingStrategy] = useState("")
  const [completedHabits, setCompletedHabits] = useState<string[]>([])
  const [targetOccurred, setTargetOccurred] = useState<boolean>()
  const [lesson, setLesson] = useState("")
  const [win, setWin] = useState("")
  const [nextAction, setNextAction] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const toggleHabit = (habit: string) =>
    setCompletedHabits((items) =>
      items.includes(habit) ? items.filter((item) => item !== habit) : [...items, habit],
    )
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      await onSave({
        date: localDate(),
        period,
        mood: mood || undefined,
        sleepQuality: period === "morning" ? sleepQuality : undefined,
        energy: period === "morning" ? energy : undefined,
        stress: period === "morning" ? stress : undefined,
        riskLevel: period === "morning" ? riskLevel : undefined,
        importantGoal: period === "morning" ? importantGoal.trim() || undefined : undefined,
        protectionAction: period === "morning" ? protectionAction.trim() || undefined : undefined,
        intention: period === "morning" ? intention.trim() || undefined : undefined,
        currentUrge: period !== "morning" ? currentUrge : undefined,
        strongestUrge: period === "evening" ? strongestUrge : undefined,
        copingStrategy: period === "evening" ? copingStrategy || undefined : undefined,
        healthyHabitsCompleted: period === "evening" ? completedHabits : [],
        targetOccurred: period !== "morning" ? targetOccurred : undefined,
        lesson: period === "evening" ? lesson.trim() || undefined : undefined,
        win: period === "evening" ? win.trim() || undefined : undefined,
        nextAction: period !== "morning" ? nextAction.trim() || undefined : undefined,
      })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  if (saved)
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Check size={24} />
        </span>
        <h2 className="mt-5 text-xl font-semibold">Check-in saved</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Showing up honestly builds recovery momentum.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/growth/recovery">Back to Recovery</Link>
        </Button>
      </div>
    )

  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-lg overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
    >
      <div className="border-b border-border px-5 py-5 sm:px-7">
        <p className="app-kicker">Under 30 seconds</p>
        <h2 className="mt-1 text-xl font-semibold">Daily check-in</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every field is optional. A minimal check-in is enough.
        </p>
        <Tabs
          value={period}
          onValueChange={(value) => setPeriod(value as DailyCheckInPeriod)}
          className="mt-5"
        >
          <TabsList className="h-11 w-full">
            <TabsTrigger value="morning">
              <Sunrise size={15} />
              Morning
            </TabsTrigger>
            <TabsTrigger value="evening">
              <Moon size={15} />
              Evening
            </TabsTrigger>
            <TabsTrigger value="minimal">
              <Sparkles size={15} />
              Minimal
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="space-y-6 px-5 py-6 sm:px-7">
        <ChoiceChips label="Mood" options={MOODS} value={mood} onChange={setMood} />
        {period === "morning" && (
          <>
            <Scale label="Sleep quality" value={sleepQuality} onChange={setSleepQuality} />
            <Scale label="Energy" value={energy} onChange={setEnergy} />
            <Scale label="Stress" value={stress} onChange={setStress} />
            <Scale label="Expected risk" value={riskLevel} onChange={setRiskLevel} />
            <TextField
              id="important-goal"
              label="Important goal today"
              value={importantGoal}
              onChange={setImportantGoal}
              placeholder="One goal that matters"
            />
            <TextField
              id="protection-action"
              label="Protection action"
              value={protectionAction}
              onChange={setProtectionAction}
              placeholder="One action that makes today easier"
            />
            <div className="space-y-2">
              <label htmlFor="intention" className="text-sm font-medium">
                Personal intention
              </label>
              <Textarea
                id="intention"
                rows={3}
                value={intention}
                onChange={(event) => setIntention(event.target.value)}
                maxLength={300}
              />
            </div>
          </>
        )}
        {period !== "morning" && (
          <>
            <UrgeScale
              label={period === "minimal" ? "Urge level" : "Current urge level"}
              value={currentUrge}
              onChange={setCurrentUrge}
            />
            {period === "evening" && (
              <>
                <UrgeScale
                  label="Strongest urge today"
                  value={strongestUrge}
                  onChange={setStrongestUrge}
                />
                <ChoiceChips
                  label="Coping strategy used"
                  options={COPING}
                  value={copingStrategy}
                  onChange={setCopingStrategy}
                />
                {healthyHabits.length > 0 && (
                  <fieldset>
                    <legend className="text-sm font-medium">Healthy habits completed</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {healthyHabits.map((habit) => (
                        <button
                          key={habit}
                          type="button"
                          aria-pressed={completedHabits.includes(habit)}
                          onClick={() => toggleHabit(habit)}
                          className={cn(
                            "min-h-10 rounded-full border px-3 py-1.5 text-sm",
                            completedHabits.includes(habit)
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border text-muted-foreground",
                          )}
                        >
                          {habit}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
              </>
            )}
            <fieldset>
              <legend className="text-sm font-medium">How was today?</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={targetOccurred === false}
                  onClick={() => setTargetOccurred(false)}
                  className={cn(
                    "min-h-12 rounded-xl border px-3 text-sm",
                    targetOccurred === false
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  Today was safe
                </button>
                <button
                  type="button"
                  aria-pressed={targetOccurred === true}
                  onClick={() => setTargetOccurred(true)}
                  className={cn(
                    "min-h-12 rounded-xl border px-3 text-sm",
                    targetOccurred === true
                      ? "border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-300"
                      : "border-border text-muted-foreground",
                  )}
                >
                  A slip occurred
                </button>
              </div>
            </fieldset>
            {period === "evening" && (
              <>
                <TextField id="lesson" label="One lesson" value={lesson} onChange={setLesson} />
                <TextField id="win" label="One win" value={win} onChange={setWin} />
              </>
            )}
            <TextField
              id="next-action"
              label="One next action"
              value={nextAction}
              onChange={setNextAction}
            />
          </>
        )}
      </div>
      <div className="border-t border-border bg-muted/20 px-5 py-4 sm:px-7">
        <Button type="submit" size="lg" className="w-full" disabled={saving}>
          {saving ? "Saving…" : "Save check-in"}
        </Button>
      </div>
    </form>
  )
}

function ChoiceChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(value === option ? "" : option)}
            className={cn(
              "min-h-10 rounded-full border px-3 py-1.5 text-sm",
              value === option
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
function Scale({
  label,
  value,
  onChange,
}: {
  label: string
  value?: number
  onChange: (value: number) => void
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((number) => (
          <button
            key={number}
            type="button"
            aria-label={`${label}: ${number} of 5`}
            aria-pressed={value === number}
            onClick={() => onChange(number)}
            className={cn(
              "min-h-11 rounded-xl border font-mono text-sm",
              value === number
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {number}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
function UrgeScale({
  label,
  value,
  onChange,
}: {
  label: string
  value?: number
  onChange: (value: number) => void
}) {
  const id = `scale-${label.toLowerCase().replaceAll(" ", "-")}`
  return (
    <div>
      <div className="flex justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className="font-mono text-sm text-primary">{value ? `${value}/10` : "—"}</span>
      </div>
      <input
        id={id}
        type="range"
        min="1"
        max="10"
        value={value ?? 1}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-11 w-full accent-primary"
      />
    </div>
  )
}
function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={200}
      />
    </div>
  )
}
