"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { formatInterval } from "@/lib/srs"
import type { PlanOutcome } from "@/lib/recovery"
import type { RecoveryPlan } from "@/lib/types"
import { itemVariants } from "@/lib/motion"

const OUTCOMES: { value: PlanOutcome; label: string }[] = [
  { value: "skipped", label: "Skipped it" },
  { value: "struggled", label: "Struggled" },
  { value: "followed", label: "Followed it" },
  { value: "followed_easily", label: "Followed it easily" },
]

function PlanCard({
  plan,
  isDue,
  isReviewing,
  submitting,
  onStartReview,
  onReview,
  onUpdate,
  onDelete,
}: {
  plan: RecoveryPlan
  isDue: boolean
  isReviewing: boolean
  submitting: boolean
  onStartReview: () => void
  onReview: (outcome: PlanOutcome) => Promise<void>
  onUpdate: (data: { ifText: string; thenText: string }) => Promise<unknown>
  onDelete: () => Promise<unknown>
}) {
  const [editing, setEditing] = useState(false)
  const [ifText, setIfText] = useState(plan.ifText)
  const [thenText, setThenText] = useState(plan.thenText)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    if (!ifText.trim() || !thenText.trim() || saving) return
    setSaving(true)
    try {
      await onUpdate({ ifText: ifText.trim(), thenText: thenText.trim() })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <motion.div
      variants={itemVariants}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        {editing ? (
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-sm font-semibold text-foreground">If</span>
              <Input value={ifText} onChange={(e) => setIfText(e.target.value)} className="h-9" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-sm font-semibold text-foreground">Then</span>
              <Input
                value={thenText}
                onChange={(e) => setThenText(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        ) : (
          <div className="min-w-0">
            <p className="text-sm text-foreground">
              <span className="font-semibold">If</span> {plan.ifText}
            </p>
            <p className="mt-1 text-sm text-foreground">
              <span className="font-semibold">Then</span> {plan.thenText}
            </p>
          </div>
        )}

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
            {plan.mastery}% mastery
          </span>
          <span className="text-xs text-muted-foreground">{formatInterval(plan.intervalDays)}</span>
        </div>
      </div>

      {editing ? (
        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !ifText.trim() || !thenText.trim()}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIfText(plan.ifText)
              setThenText(plan.thenText)
              setEditing(false)
            }}
          >
            Cancel
          </Button>
        </div>
      ) : isReviewing ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {OUTCOMES.map((o) => (
            <button
              key={o.value}
              type="button"
              disabled={submitting}
              onClick={() => onReview(o.value)}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-semibold text-foreground transition-all hover:bg-accent disabled:opacity-50"
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onStartReview}>
            {isDue ? "Rehearse" : "Rehearse early"}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditing(true)}
            aria-label="Edit plan"
          >
            <Pencil size={14} />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Delete plan">
                <Trash2 size={14} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
                <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting}
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </motion.div>
  )
}

export function PlansList({
  plans,
  duePlans,
  onReview,
  onUpdate,
  onDelete,
}: {
  plans: RecoveryPlan[]
  duePlans: RecoveryPlan[]
  onReview: (id: string, outcome: PlanOutcome) => Promise<unknown>
  onUpdate: (id: string, data: { ifText: string; thenText: string }) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleReview = async (id: string, outcome: PlanOutcome) => {
    setSubmitting(true)
    try {
      await onReview(id, outcome)
      setActiveId(null)
    } finally {
      setSubmitting(false)
    }
  }

  if (plans.length === 0) {
    return (
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm"
      >
        <p className="text-sm text-muted-foreground">
          No plans yet — a plan gets created after a debrief. It&apos;ll show up here to rehearse.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      {duePlans.length > 0 && (
        <motion.p variants={itemVariants} className="text-sm font-semibold text-muted-foreground">
          {duePlans.length} due for rehearsal
        </motion.p>
      )}
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          isDue={duePlans.some((p) => p.id === plan.id)}
          isReviewing={activeId === plan.id}
          submitting={submitting}
          onStartReview={() => setActiveId(plan.id)}
          onReview={(outcome) => handleReview(plan.id, outcome)}
          onUpdate={(data) => onUpdate(plan.id, data)}
          onDelete={() => onDelete(plan.id)}
        />
      ))}
    </div>
  )
}
