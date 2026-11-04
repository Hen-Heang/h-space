"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { itemVariants } from "@/lib/motion"

export function DebriefForm({
  onSave,
}: {
  onSave: (input: { reflection: string; ifText?: string; thenText?: string }) => Promise<void>
}) {
  const [stabilizingAction, setStabilizingAction] = useState("")
  const [where, setWhere] = useState("")
  const [feeling, setFeeling] = useState("")
  const [chain, setChain] = useState("")
  const [breakLink, setBreakLink] = useState("")

  const [ifText, setIfText] = useState("")
  const [thenText, setThenText] = useState("")
  const [ifEdited, setIfEdited] = useState(false)
  const [thenEdited, setThenEdited] = useState(false)
  const [saving, setSaving] = useState(false)

  // The plan drafts itself from the reflection as the user types — editable,
  // never presented as final until they hit save.
  useEffect(() => {
    if (!ifEdited)
      setIfText(where.trim() ? `I'm ${where.trim()} again` : "I'm in this situation again")
  }, [where, ifEdited])

  useEffect(() => {
    if (!thenEdited) setThenText(breakLink.trim())
  }, [breakLink, thenEdited])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const reflection = [
        stabilizingAction && `Action now: ${stabilizingAction}`,
        where.trim() && `Where: ${where.trim()}`,
        feeling.trim() && `Felt (30 min before): ${feeling.trim()}`,
        chain.trim() && `Chain of events: ${chain.trim()}`,
      ]
        .filter(Boolean)
        .join("\n")
      await onSave({
        reflection,
        ifText: ifText.trim() || undefined,
        thenText: thenText.trim() || undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.form
      variants={itemVariants}
      onSubmit={handleSubmit}
      className="mx-auto max-w-lg space-y-6 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8"
    >
      <div>
        <p className="app-kicker">Continue recovery</p>
        <h2 className="mt-2 text-xl font-bold text-foreground">
          One moment does not erase your progress.
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Let&apos;s protect the rest of today. Your current streak may change, but your recovery
          progress does not disappear.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">
          Choose one stabilizing action
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            "Close the content",
            "Leave the room",
            "Drink water",
            "Take a shower",
            "Take a walk",
            "Start a safe task",
            "Contact support",
            "Prepare for sleep",
          ].map((action) => (
            <button
              key={action}
              type="button"
              aria-pressed={stabilizingAction === action}
              onClick={() => setStabilizingAction(action)}
              className={`min-h-12 rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors ${stabilizingAction === action ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}
            >
              {action}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="border-t border-border pt-5">
        <h2 className="text-base font-semibold">
          Private reflection <span className="font-normal text-muted-foreground">(optional)</span>
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Record only what helps you prepare. Do not include private detail you do not need.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="debrief-where" className="text-sm font-semibold text-foreground">
          Where were you?
        </label>
        <Input
          id="debrief-where"
          value={where}
          onChange={(e) => setWhere(e.target.value)}
          placeholder="e.g. at my desk, in bed"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="debrief-feeling" className="text-sm font-semibold text-foreground">
          What did you feel 30 minutes before?
        </label>
        <Input
          id="debrief-feeling"
          value={feeling}
          onChange={(e) => setFeeling(e.target.value)}
          placeholder="e.g. bored, tired, anxious"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="debrief-chain" className="text-sm font-semibold text-foreground">
          What happened before it?
        </label>
        <Textarea
          id="debrief-chain"
          value={chain}
          onChange={(e) => setChain(e.target.value)}
          rows={3}
          placeholder="A short sequence is enough"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="debrief-break" className="text-sm font-semibold text-foreground">
          What could make the next situation easier?
        </label>
        <Textarea
          id="debrief-break"
          value={breakLink}
          onChange={(e) => setBreakLink(e.target.value)}
          rows={2}
          placeholder="One small, specific change"
        />
      </div>

      {breakLink.trim() && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Your plan
          </p>
          <div className="space-y-1.5">
            <label htmlFor="debrief-if" className="text-xs font-medium text-muted-foreground">
              If
            </label>
            <Input
              id="debrief-if"
              value={ifText}
              onChange={(e) => {
                setIfText(e.target.value)
                setIfEdited(true)
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="debrief-then" className="text-xs font-medium text-muted-foreground">
              Then
            </label>
            <Input
              id="debrief-then"
              value={thenText}
              onChange={(e) => {
                setThenText(e.target.value)
                setThenEdited(true)
              }}
            />
          </div>
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={saving}>
        {saving ? "Saving…" : breakLink.trim() ? "Save plan & continue" : "Continue recovery"}
      </Button>
    </motion.form>
  )
}
