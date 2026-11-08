"use client"

import { useState } from "react"
import { Archive, Check, Loader2, Plus, Target, X } from "lucide-react"
import { toast } from "sonner"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { keyResultsApi, getApiErrorMessage } from "@/lib/api"
import { keyResultProgress } from "@/lib/goal-progress"
import {
  KEY_RESULT_METRIC_TYPES,
  type GoalKeyResult,
  type KeyResultMetricType,
} from "@/lib/goal-key-results"

/**
 * Key results for a goal — the measurable proof-of-outcome layer (Goal
 * System v2). Distinct from a goal's milestone checklist (stored in
 * goal.metadata): key results have a metric type, baseline/target/current
 * value, and a weight that feeds the weighted outcome-progress calculation
 * in lib/goal-progress.ts.
 *
 * Manual current-value updates only in this phase — data_source options
 * other than "manual" exist in the schema (see lib/goal-key-results.ts) but
 * aren't wired to a live signal yet.
 */
export function KeyResultsCard({
  goalId,
  keyResults,
  onChanged,
}: {
  goalId: string
  keyResults: GoalKeyResult[]
  onChanged: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [creating, setCreating] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: "",
    metric_type: "number" as KeyResultMetricType,
    baseline_value: "",
    target_value: "",
    unit: "",
    weight: "1",
  })

  const active = keyResults.filter((kr) => kr.status !== "archived")

  async function createKeyResult() {
    const title = form.title.trim()
    if (!title) return
    setCreating(true)
    try {
      await keyResultsApi.create({
        goal_id: goalId,
        title,
        metric_type: form.metric_type,
        baseline_value: form.baseline_value === "" ? null : Number(form.baseline_value),
        target_value: form.target_value === "" ? null : Number(form.target_value),
        unit: form.unit || null,
        weight: form.weight === "" ? 1 : Number(form.weight),
      })
      onChanged()
      setForm({
        title: "",
        metric_type: "number",
        baseline_value: "",
        target_value: "",
        unit: "",
        weight: "1",
      })
      setAdding(false)
      toast.success("Key result added")
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't add the key result. Please try again."))
    } finally {
      setCreating(false)
    }
  }

  async function updateCurrentValue(kr: GoalKeyResult, raw: string) {
    if (raw === "") return
    const value = Number(raw)
    if (!Number.isFinite(value)) return
    setSavingId(kr.id)
    try {
      await keyResultsApi.update(kr.id, { current_value: value })
      onChanged()
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't update this key result."))
    } finally {
      setSavingId(null)
    }
  }

  async function toggleBoolean(kr: GoalKeyResult) {
    setSavingId(kr.id)
    try {
      await keyResultsApi.update(kr.id, { current_value: kr.current_value ? 0 : 1 })
      onChanged()
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't update this key result."))
    } finally {
      setSavingId(null)
    }
  }

  async function archive(kr: GoalKeyResult) {
    setSavingId(kr.id)
    try {
      await keyResultsApi.archive(kr.id)
      onChanged()
      toast.success("Key result archived")
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't archive this key result."))
    } finally {
      setSavingId(null)
    }
  }

  // Inputs: 16px (no iOS zoom on focus), 44px tall on touch, one border.
  const field =
    "h-10 rounded-lg border border-border bg-background px-3 text-base text-foreground outline-none transition-colors focus-visible:border-ring [@media(pointer:coarse)]:h-11"

  // One surface: a heading with a one-line explanation, key results as
  // divided rows (no bordered box per row inside the card), then "Add".
  return (
    <Card className="p-4 sm:p-5">
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Target size={16} aria-hidden="true" className="text-muted-foreground" />
          Key results
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">What proves this goal is working.</p>
      </div>

      <div className="mt-3">
        {active.length === 0 && !adding && (
          <p className="py-2 text-sm text-muted-foreground">
            No key results yet. Add one to measure the real outcome instead of just task completion
            — this goal&apos;s progress bar will keep showing legacy task activity until you do.
          </p>
        )}

        <ul className="divide-y divide-border">
          {active.map((kr) => {
            const pct = keyResultProgress(kr)
            const isSaving = savingId === kr.id
            return (
              <li key={kr.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 break-words text-base font-medium text-foreground">
                      {kr.title}
                    </p>
                    {kr.description && (
                      <p className="mt-0.5 break-words text-sm text-muted-foreground">
                        {kr.description}
                      </p>
                    )}
                  </div>
                  <div className="-my-1 flex shrink-0 items-center gap-1">
                    {isSaving && (
                      <Loader2
                        size={14}
                        className="animate-spin text-muted-foreground"
                        aria-label="Saving"
                      />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void archive(kr)}
                      aria-label={`Archive key result: ${kr.title}`}
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Archive size={16} aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                <div
                  className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${kr.title} progress`}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span className="tabular-nums">
                    {kr.metric_type === "boolean"
                      ? kr.current_value
                        ? "Done"
                        : "Not yet"
                      : `${kr.current_value ?? kr.baseline_value ?? 0}${kr.unit ? ` ${kr.unit}` : ""} / ${
                          kr.target_value ?? "—"
                        }${kr.unit ? ` ${kr.unit}` : ""}`}
                    {" · "}
                    {pct}%
                  </span>

                  {kr.metric_type === "boolean" ? (
                    <Button size="sm" variant="outline" onClick={() => void toggleBoolean(kr)}>
                      Mark {kr.current_value ? "not done" : "done"}
                    </Button>
                  ) : (
                    <label className="flex items-center gap-2">
                      Update
                      <input
                        type="number"
                        inputMode="decimal"
                        defaultValue={kr.current_value ?? ""}
                        onBlur={(e) => void updateCurrentValue(kr, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                        }}
                        aria-label={`Current value for ${kr.title}`}
                        className={cn(field, "w-24")}
                      />
                    </label>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {adding ? (
        <div className="mt-3 space-y-3 border-t border-border pt-4">
          <input
            autoFocus
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Two-minute work update score"
            aria-label="Key result title"
            className={cn(field, "w-full")}
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={form.metric_type}
              onChange={(e) =>
                setForm((f) => ({ ...f, metric_type: e.target.value as KeyResultMetricType }))
              }
              aria-label="Metric type"
              className={cn(field, "px-2")}
            >
              {KEY_RESULT_METRIC_TYPES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            {form.metric_type !== "boolean" && (
              <>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Baseline"
                  value={form.baseline_value}
                  onChange={(e) => setForm((f) => ({ ...f, baseline_value: e.target.value }))}
                  aria-label="Baseline value"
                  className={cn(field, "w-28")}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Target"
                  value={form.target_value}
                  onChange={(e) => setForm((f) => ({ ...f, target_value: e.target.value }))}
                  aria-label="Target value"
                  className={cn(field, "w-28")}
                />
                <input
                  type="text"
                  placeholder="Unit"
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  aria-label="Unit"
                  className={cn(field, "w-24")}
                />
              </>
            )}
            <input
              type="number"
              inputMode="decimal"
              placeholder="Weight"
              value={form.weight}
              onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
              aria-label="Weight"
              className={cn(field, "w-24")}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void createKeyResult()}
              disabled={!form.title.trim() || creating}
            >
              {creating ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <Check size={16} aria-hidden="true" />
              )}
              Add
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setAdding(false)}
              aria-label="Cancel adding key result"
            >
              <X size={16} aria-hidden="true" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAdding(true)}
          className="mt-3 gap-1.5"
        >
          <Plus size={16} aria-hidden="true" /> Add key result
        </Button>
      )}
    </Card>
  )
}
