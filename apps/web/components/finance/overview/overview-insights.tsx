import Link from "next/link"
import { CheckCircle2, ChevronRight, CircleAlert, Eye, HelpCircle } from "lucide-react"

import { FinanceProgress, FinanceSection } from "@/components/finance/ui/finance-primitives"
import { krw } from "@/lib/finance-format"
import { cn } from "@/lib/utils"
import type {
  DailySpendingPoint,
  FinanceBucketHealth,
  FinancialHealthSummary,
} from "@/types/finance"

const BUCKET_LABEL: Record<FinanceBucketHealth["bucket"], string> = {
  essential: "Essentials",
  lifestyle: "Lifestyle",
  future: "Future",
}

const BUCKET_STATUS: Record<
  FinanceBucketHealth["status"],
  { label: string; tone: "positive" | "warning" | "expense" | "neutral"; className: string }
> = {
  healthy: { label: "Healthy", tone: "positive", className: "text-success" },
  watch: { label: "Watch", tone: "warning", className: "text-warning" },
  over: { label: "Over", tone: "expense", className: "text-destructive" },
  below: { label: "Below target", tone: "expense", className: "text-destructive" },
  unavailable: { label: "Unavailable", tone: "neutral", className: "text-muted-foreground" },
}

const OVERALL_STATUS: Record<
  FinancialHealthSummary["overallStatus"],
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  good: { label: "Good", icon: CheckCircle2, className: "text-success" },
  watch: { label: "Watch", icon: Eye, className: "text-warning" },
  attention: { label: "Attention", icon: CircleAlert, className: "text-destructive" },
  unavailable: { label: "Unavailable", icon: HelpCircle, className: "text-muted-foreground" },
}

// The bar is the bucket's share of its own target, not of income: a full bar
// means "at or past the line"; the status label says which side that is.
function bucketProgressValue(health: FinanceBucketHealth): number {
  if (health.percentageOfIncome === null || health.targetPercentage <= 0) return 0
  return (health.percentageOfIncome / health.targetPercentage) * 100
}

/** The money rule (Essentials · Lifestyle · Future) as one surface, three columns. */
export function FinancialHealth({ health }: { health: FinancialHealthSummary }) {
  const overall = OVERALL_STATUS[health.overallStatus]
  const OverallIcon = overall.icon
  const recommendations =
    health.overallStatus === "unavailable" ? [] : health.recommendations.slice(0, 2)

  return (
    <FinanceSection
      id="finance-health"
      title="Financial health"
      description="Essentials, lifestyle and future against your money rule."
      action={
        <p
          className={cn("inline-flex items-center gap-1.5 text-sm font-medium", overall.className)}
        >
          <OverallIcon className="size-4" aria-hidden="true" />
          {overall.label}
        </p>
      }
    >
      <div className="app-surface min-w-0 overflow-hidden">
        <div className="grid divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          <Bucket health={health.essential} />
          <Bucket health={health.lifestyle} />
          <Bucket health={health.future} />
        </div>
        {recommendations.length > 0 && (
          <div className="space-y-1 border-t border-border px-4 py-3 sm:px-6">
            {recommendations.map((note, index) => (
              <p
                key={note}
                className={cn(
                  "text-sm leading-relaxed",
                  index === 0 ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {note}
              </p>
            ))}
          </div>
        )}
      </div>
    </FinanceSection>
  )
}

function Bucket({ health }: { health: FinanceBucketHealth }) {
  const label = BUCKET_LABEL[health.bucket]
  const status = BUCKET_STATUS[health.status]
  const pct = health.percentageOfIncome === null ? "—" : `${Math.round(health.percentageOfIncome)}%`
  const target = `${health.direction === "maximum" ? "max" : "min"} ${health.targetPercentage}%`

  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-base font-medium">{label}</p>
        {health.status !== "unavailable" && (
          <p className={cn("text-sm font-medium", status.className)}>{status.label}</p>
        )}
      </div>
      <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">
        {pct}
        <span className="ml-1.5 text-sm font-normal text-muted-foreground">
          of income · {target}
        </span>
      </p>
      <div className="mt-2">
        <FinanceProgress
          value={bucketProgressValue(health)}
          label={`${label} is ${pct} of income against a ${target} guideline`}
          tone={status.tone}
        />
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground tabular-nums">
        {krw.format(health.amountKrw)}
      </p>
    </div>
  )
}

/** Daily expenses across the month: one line, a peak and a count. */
export function SpendingTrend({ data }: { data: DailySpendingPoint[] }) {
  const width = 620
  const height = 160
  // Points stay this far (viewBox units) inside the left/right edges, so the
  // 2.5px line and its round caps aren't cut off when the first or last day
  // is a peak. 6 units is ≈2–4px at phone widths, wider than half the stroke.
  const inset = 6
  const span = width - inset * 2
  const max = Math.max(1, ...data.map((point) => point.amountKrw))
  const points = data.map((point, index) => ({
    x: inset + (data.length <= 1 ? 0 : (index / (data.length - 1)) * span),
    y: height - (point.amountKrw / max) * (height - 12),
  }))
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ")
  const lastX = points.at(-1)?.x ?? inset
  const areaPath =
    points.length > 0 ? `${linePath} L ${lastX} ${height} L ${inset} ${height} Z` : ""
  const activeDays = data.filter((point) => point.amountKrw > 0).length
  const peak = data.reduce(
    (highest, point) => (point.amountKrw > highest.amountKrw ? point : highest),
    data[0] ?? { date: "", amountKrw: 0 },
  )

  return (
    <FinanceSection id="finance-trends" title="Daily spending">
      <div className="min-w-0">
        <p id="spending-trend-summary" className="text-sm text-muted-foreground">
          Peak day{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {krw.format(peak.amountKrw)}
          </span>{" "}
          · spending on {activeDays} of {data.length} days
        </p>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="mt-3 h-36 w-full overflow-visible sm:h-40"
          role="img"
          aria-labelledby="spending-trend-title spending-trend-summary"
          preserveAspectRatio="none"
        >
          <title id="spending-trend-title">Daily expense trend</title>
          <defs>
            <linearGradient id="finance-overview-trend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--finance-chart)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--finance-chart)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line
            x1="0"
            x2={width}
            y1={height}
            y2={height}
            stroke="var(--border)"
            vectorEffect="non-scaling-stroke"
          />
          {areaPath ? <path d={areaPath} fill="url(#finance-overview-trend)" /> : null}
          {linePath ? (
            <path
              d={linePath}
              fill="none"
              stroke="var(--finance-chart)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>Day 1</span>
          <span>Day {data.length}</span>
        </div>
      </div>
    </FinanceSection>
  )
}

/** The way into the month's full review. */
export function ReviewLink({ monthLabel }: { monthLabel: string }) {
  return (
    <Link
      href="/finance/review"
      className="app-surface flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-6"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium">Review {monthLabel}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          Totals, category changes, budgets, subscriptions and savings goals.
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  )
}
