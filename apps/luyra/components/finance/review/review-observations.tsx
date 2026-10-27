"use client";

import { CircleCheck, Lightbulb, TriangleAlert } from "lucide-react";
import { FinanceEmptyState } from "@/components/finance/ui/finance-primitives";
import { cn } from "@/lib/utils";
import type { ReviewObservation } from "@/types/finance";

const TONE_ICON = { positive: CircleCheck, warning: TriangleAlert, neutral: Lightbulb } as const;
const TONE_CLASS = { positive: "text-success", warning: "text-warning", neutral: "text-muted-foreground" } as const;

export function ReviewObservations({ observations }: { observations: ReviewObservation[] }) {
  if (observations.length === 0) {
    return (
      <FinanceEmptyState
        icon={Lightbulb}
        title="No notable changes"
        description="Deterministic observations appear here once spending, budgets, or savings rate shift enough month over month."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="divide-y divide-border">
        {observations.map((observation) => {
          const Icon = TONE_ICON[observation.tone];
          return (
            <div key={observation.id} className="flex items-start gap-3 p-4">
              <Icon className={cn("mt-0.5 size-4 shrink-0", TONE_CLASS[observation.tone])} aria-hidden="true" />
              <p className="text-sm leading-relaxed">{observation.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
