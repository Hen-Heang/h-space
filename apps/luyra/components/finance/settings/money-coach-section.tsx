"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthSelector } from "@/components/finance/ui/finance-primitives";
import { getMoneyCoachInsight, upsertBudget, type MoneyCoachRecommendation } from "@/lib/api/finance";
import { krw } from "@/lib/finance-format";
import { monthKey, monthLabel } from "@/lib/finance-month";
import { useInvalidateAfter } from "@/lib/query/finance-queries";

type InsightState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "not_configured" }
  | { status: "error" }
  | { status: "ready"; summary: string; recommendation: MoneyCoachRecommendation | null };

export function MoneyCoachSection() {
  const [monthOffset, setMonthOffset] = useState(-1);
  const [state, setState] = useState<InsightState>({ status: "idle" });
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const invalidateAfter = useInvalidateAfter();

  function handleMonthChange(nextOffset: number) {
    setMonthOffset(nextOffset);
    setState({ status: "idle" });
    setApplied(false);
    setDismissed(false);
  }

  async function handleGetInsights() {
    setState({ status: "loading" });
    setApplied(false);
    setDismissed(false);
    try {
      const result = await getMoneyCoachInsight(monthKey(monthOffset));
      if (!result.ok) {
        setState(result.reason === "not_configured" ? { status: "not_configured" } : { status: "error" });
        return;
      }
      setState({ status: "ready", summary: result.data.summary, recommendation: result.data.recommendation });
    } catch {
      setState({ status: "error" });
    }
  }

  async function handleApply(recommendation: MoneyCoachRecommendation) {
    setApplying(true);
    try {
      await upsertBudget({ categoryId: recommendation.categoryId, amountKrw: recommendation.suggestedBudgetKrw });
      void invalidateAfter("budget");
      setApplied(true);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Deterministic facts go in; Claude only explains and prioritizes — it never computes totals and never changes
          Finance data on its own.
        </p>
        <MonthSelector
          label={monthLabel(monthOffset)}
          onPrevious={() => handleMonthChange(monthOffset - 1)}
          onNext={() => handleMonthChange(monthOffset + 1)}
          nextDisabled={monthOffset >= 0}
          ariaLabel="Money Coach month selector"
          size="sm"
        />
      </div>

      {state.status === "idle" && (
        <Button size="sm" className="min-h-11" onClick={handleGetInsights}>
          <Sparkles className="size-4" aria-hidden="true" />
          Get insights
        </Button>
      )}

      {state.status === "loading" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Thinking…
        </p>
      )}

      {state.status === "not_configured" && (
        <p className="text-sm text-muted-foreground">
          AI Money Coach isn&apos;t configured. Set <code className="rounded bg-secondary px-1 py-0.5">ANTHROPIC_API_KEY</code> to
          enable it.
        </p>
      )}

      {state.status === "error" && (
        <div className="space-y-2">
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
            Couldn&apos;t get insights for {monthLabel(monthOffset)}. Try again.
          </p>
          <Button variant="outline" size="sm" onClick={handleGetInsights}>
            Try again
          </Button>
        </div>
      )}

      {state.status === "ready" && (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">{state.summary}</p>

          {state.recommendation && !dismissed && (
            <div className="rounded-xl border bg-secondary/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Review recommendation</p>
              <p className="mt-1 text-sm font-medium">{state.recommendation.categoryName} budget</p>
              <div className="mt-2 flex items-center gap-3 font-mono text-sm tabular-nums">
                <span className="text-muted-foreground">Current: {krw.format(state.recommendation.currentBudgetKrw)}</span>
                <span aria-hidden="true">→</span>
                <span className="font-semibold">Suggested: {krw.format(state.recommendation.suggestedBudgetKrw)}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{state.recommendation.rationale}</p>

              {applied ? (
                <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-success">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Applied to your budget.
                </p>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDismissed(true)} disabled={applying}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => handleApply(state.recommendation as MoneyCoachRecommendation)} disabled={applying}>
                    {applying ? "Applying…" : "Apply"}
                  </Button>
                </div>
              )}
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleGetInsights}>
            <Sparkles className="size-4" aria-hidden="true" />
            Refresh insights
          </Button>
        </div>
      )}
    </div>
  );
}
