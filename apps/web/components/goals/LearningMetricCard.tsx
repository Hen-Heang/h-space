"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { BarChart3, Loader2, Pencil, Sparkles, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { goalsApi, progressApi, getApiErrorMessage } from "@/lib/api"
import type { Goal, LearningMetric, LearningMetricSource, LearningMetricWindow } from "@/lib/goals"
import { cn } from "@/lib/utils"

const SOURCE_OPTIONS: { value: LearningMetricSource; label: string }[] = [
  { value: "vocab_cards", label: "Vocab saved" },
  { value: "corrections", label: "Corrections logged" },
  { value: "foundation_lessons", label: "Foundation lessons completed" },
  { value: "activity_sessions", label: "Feature sessions" },
]

const FEATURE_OPTIONS = [
  { value: "vocab", label: "Vocab" },
  { value: "chat", label: "AI Coach" },
  { value: "listening", label: "Listening" },
  { value: "reading", label: "Reading" },
  { value: "interview", label: "Interview prep" },
  { value: "scenarios", label: "Scenarios" },
  { value: "foundations", label: "Foundations" },
  { value: "practice", label: "Daily phrase" },
]

const WINDOW_OPTIONS: { value: LearningMetricWindow; label: string }[] = [
  { value: "total", label: "All time" },
  { value: "weekly", label: "This week" },
  { value: "daily", label: "Today" },
]

function sourceLabel(source: LearningMetricSource) {
  return SOURCE_OPTIONS.find((o) => o.value === source)?.label ?? source
}

function featureLabel(feature?: string) {
  return FEATURE_OPTIONS.find((o) => o.value === feature)?.label ?? feature
}

function windowLabel(window: LearningMetricWindow) {
  return WINDOW_OPTIONS.find((o) => o.value === window)?.label ?? window
}

/**
 * Lets a goal auto-track progress against a real learning metric (vocab
 * saved, corrections logged, foundation lessons completed, or feature session
 * count) instead of relying purely on the manual task checklist. Persists in
 * `goal.metadata.learning_metric` (no backend change) and reports the updated
 * goal up so the page's React Query cache stays in sync.
 */
export function LearningMetricCard({
  goal,
  onGoalUpdated,
}: {
  goal: Goal
  onGoalUpdated: (goal: Goal) => void
}) {
  const metric = goal.metadata?.learning_metric
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draftSource, setDraftSource] = useState<LearningMetricSource>(
    metric?.source ?? "vocab_cards",
  )
  const [draftFeature, setDraftFeature] = useState<string>(metric?.feature ?? "vocab")
  const [draftWindow, setDraftWindow] = useState<LearningMetricWindow>(metric?.window ?? "total")
  const [draftTarget, setDraftTarget] = useState<string>(String(metric?.targetCount ?? 20))

  const { data: count, isPending: countLoading } = useQuery({
    queryKey: ["goal-learning-metric", goal.id, metric],
    queryFn: () => progressApi.getMetricCount(metric as LearningMetric),
    enabled: !!metric,
  })

  async function persist(next: LearningMetric | undefined) {
    const prev = goal
    onGoalUpdated({ ...goal, metadata: { ...goal.metadata, learning_metric: next } })
    setSaving(true)
    try {
      const updated = await goalsApi.update(goal.id, {
        metadata: { ...goal.metadata, learning_metric: next },
      })
      onGoalUpdated(updated)
      setEditing(false)
    } catch (err) {
      onGoalUpdated(prev)
      toast.error(getApiErrorMessage(err, "Couldn't save the tracked metric. Please try again."))
    } finally {
      setSaving(false)
    }
  }

  function startEdit() {
    setDraftSource(metric?.source ?? "vocab_cards")
    setDraftFeature(metric?.feature ?? "vocab")
    setDraftWindow(metric?.window ?? "total")
    setDraftTarget(String(metric?.targetCount ?? 20))
    setEditing(true)
  }

  function save() {
    const targetCount = Math.max(1, Math.round(Number(draftTarget) || 0))
    void persist({
      source: draftSource,
      feature: draftSource === "activity_sessions" ? draftFeature : undefined,
      window: draftWindow,
      targetCount,
    })
  }

  const pct =
    metric && count != null ? Math.min(100, Math.round((count / metric.targetCount) * 100)) : 0

  return (
    <Card className="border-border bg-card/50 p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={15} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Learning progress</h3>
          <span className="rounded-full bg-accent/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
            auto-tracked
          </span>
          {saving && <Loader2 size={13} className="animate-spin text-muted-foreground/40" />}
        </div>
        {metric && !editing && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={startEdit}
              aria-label="Edit tracked metric"
              className="rounded-lg p-1.5 text-muted-foreground/40 transition-all hover:bg-accent hover:text-foreground active:scale-90"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => void persist(undefined)}
              aria-label="Stop tracking"
              className="rounded-lg p-1.5 text-muted-foreground/40 transition-all hover:bg-destructive/10 hover:text-destructive active:scale-90"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {metric && !editing ? (
        <>
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            {sourceLabel(metric.source)}
            {metric.source === "activity_sessions" && metric.feature
              ? ` · ${featureLabel(metric.feature)}`
              : ""}
            {" · "}
            {windowLabel(metric.window)}
          </p>
          <div className="mt-4 flex items-center justify-between text-xs font-medium">
            <span className="text-muted-foreground">Progress</span>
            <span className="tabular-nums text-foreground">
              {countLoading ? <Loader2 size={12} className="inline animate-spin" /> : (count ?? 0)}{" "}
              / {metric.targetCount}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-foreground/5">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      ) : editing ? (
        <div className="mt-4 space-y-3 rounded-2xl border border-primary/30 bg-primary/[0.03] p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Select
              value={draftSource}
              onValueChange={(v) => setDraftSource(v as LearningMetricSource)}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {draftSource === "activity_sessions" && (
              <Select value={draftFeature} onValueChange={setDraftFeature}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEATURE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select
              value={draftWindow}
              onValueChange={(v) => setDraftWindow(v as LearningMetricWindow)}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WINDOW_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <input
              type="number"
              min={1}
              value={draftTarget}
              onChange={(e) => setDraftTarget(e.target.value)}
              placeholder="Target count"
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving || !draftTarget}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-40",
              )}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex h-9 items-center rounded-xl border border-border px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-all hover:bg-accent active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-background/30 p-4">
          <p className="text-sm font-medium text-muted-foreground">
            Link this goal to a real learning metric so progress reflects what you actually
            practiced, not just checked-off tasks.
          </p>
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-95"
          >
            <BarChart3 size={14} /> Auto-track this goal
          </button>
        </div>
      )}
    </Card>
  )
}
