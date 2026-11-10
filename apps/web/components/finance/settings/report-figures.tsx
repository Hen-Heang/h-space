import type { ReactNode } from "react"
import { AmountText } from "@/components/finance/ui/finance-primitives"
import { cn } from "@/lib/utils"

export type ReportFigure = { label: string; value: string; tone?: "positive" | "negative" }

/**
 * A report's headline numbers as one flat row of label/value pairs — in place
 * of a grid of bordered tiles inside the Reports box.
 */
export function ReportFigures({ figures }: { figures: ReportFigure[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-3 sm:grid-cols-4">
      {figures.map((figure) => (
        <div key={figure.label} className="min-w-0">
          <dt className="text-sm text-muted-foreground">{figure.label}</dt>
          <dd
            className={cn(
              "mt-0.5 [overflow-wrap:anywhere] text-lg font-semibold leading-tight tracking-tight tabular-nums",
              figure.tone === "positive" && "text-success",
              figure.tone === "negative" && "text-destructive",
            )}
          >
            <AmountText value={figure.value} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** A titled part of a report. */
export function ReportPart({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold">{title}</h3>
      {children}
    </div>
  )
}

export function toneOf(value: number): ReportFigure["tone"] {
  return value > 0 ? "positive" : value < 0 ? "negative" : undefined
}
