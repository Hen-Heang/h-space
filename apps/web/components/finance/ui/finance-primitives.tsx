import { Fragment } from "react"
import type { LucideIcon } from "lucide-react"
import { ChevronLeft, ChevronRight, CircleAlert, RefreshCw, WalletCards } from "lucide-react"
import { Button } from "@/components/finance/base/button"
import { splitCurrency } from "@/lib/finance-format"
import { cn } from "@/lib/utils"

type FinanceTone = "neutral" | "positive" | "expense" | "warning"

const TONE_STYLES: Record<FinanceTone, { value: string }> = {
  neutral: { value: "text-foreground" },
  positive: { value: "text-success" },
  expense: { value: "text-destructive" },
  warning: { value: "text-warning" },
}

/**
 * A formatted amount with its currency symbol lifted out of the monospace run.
 * Geist Mono carries no ₩, so inline it falls through to a CJK fallback whose
 * glyph is twice the mono cell and whose ink overshoots its own advance — at
 * display sizes that lands on top of the first digit. Giving the symbol its own
 * box with normal tracking and a little trailing room absorbs the overshoot.
 * Values with no leading symbol (percentages, counts) pass through untouched.
 *
 * A line-break opportunity (<wbr>) follows each thousands separator, so when a
 * very large amount can't fit its column it wraps between digit groups
 * ("₩1,234,567,/890,000") instead of mid-group, and never clips.
 */
export function AmountText({ value }: { value: string }) {
  const parts = splitCurrency(value)
  if (!parts) return <>{value}</>
  const groups = parts.digits.split(",")
  return (
    <>
      {parts.sign}
      <span className="pr-[max(0.08em,3.5px)] font-sans tracking-normal">{parts.symbol}</span>
      {groups.map((group, index) => (
        <Fragment key={index}>
          {group}
          {index < groups.length - 1 && (
            <>
              ,<wbr />
            </>
          )}
        </Fragment>
      ))}
    </>
  )
}

export function FinanceSection({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  id: string
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section aria-labelledby={id} className={cn("min-w-0 space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id={id} className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function FinanceMetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
  valueTone,
  surfaceTone,
  featured = false,
}: {
  label: string
  value: string
  detail: React.ReactNode
  icon: LucideIcon
  tone?: FinanceTone
  valueTone?: FinanceTone
  surfaceTone?: FinanceTone
  featured?: boolean
}) {
  // Calm by default: one neutral border, a plain icon, and colour only where
  // it is a state. `surfaceTone` is still accepted so callers don't change,
  // but a tile no longer gets a tinted frame or a tinted icon chip.
  void surfaceTone
  const iconClass = tone === "neutral" ? "text-muted-foreground" : TONE_STYLES[tone].value
  const valueStyles = TONE_STYLES[valueTone ?? tone]
  return (
    <div
      className={cn(
        "flex h-full min-w-0 flex-col rounded-xl border border-border bg-card p-4",
        featured ? "min-h-44 justify-between sm:p-5" : "gap-2",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon aria-hidden="true" className={cn("size-4 shrink-0", iconClass)} />
      </div>
      <div>
        <p
          className={cn(
            "[overflow-wrap:anywhere] font-semibold leading-tight tracking-tight tabular-nums",
            featured ? "text-[clamp(1.75rem,8vw,2.5rem)]" : "text-xl sm:text-2xl",
            valueStyles.value,
          )}
          title={value}
        >
          <AmountText value={value} />
        </p>
        <div className="mt-1.5 text-sm text-muted-foreground">{detail}</div>
      </div>
    </div>
  )
}

export function CategoryIcon({
  icon,
  color,
  className,
}: {
  icon: string | null
  color: string | null
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl border text-lg",
        className,
      )}
      style={{
        backgroundColor: color
          ? `color-mix(in srgb, ${color} 12%, transparent)`
          : "var(--secondary)",
        borderColor: color ? `color-mix(in srgb, ${color} 22%, transparent)` : "var(--border)",
        color: color ?? "var(--foreground)",
      }}
      aria-hidden="true"
    >
      {icon ? icon : <WalletCards className="size-4" />}
    </span>
  )
}

export function FinanceProgress({
  value,
  label,
  tone = "neutral",
  color,
}: {
  value: number
  label: string
  tone?: FinanceTone
  color?: string | null
}) {
  const fillClass = {
    neutral: "bg-finance-chart",
    positive: "bg-success",
    expense: "bg-destructive",
    warning: "bg-warning",
  }[tone]
  const safeValue = Number.isFinite(value) ? value : 0
  const visualValue = Math.min(Math.max(safeValue, 0), 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(visualValue)}
      className="h-2 overflow-hidden rounded-full bg-secondary"
    >
      <div
        className={cn(
          "h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500",
          color ? undefined : fillClass,
        )}
        style={{ width: `${visualValue}%`, backgroundColor: color ?? undefined }}
      />
    </div>
  )
}

export function MonthSelector({
  label,
  onPrevious,
  onNext,
  nextDisabled,
  ariaLabel,
  size = "md",
}: {
  label: string
  onPrevious: () => void
  onNext: () => void
  nextDisabled?: boolean
  ariaLabel: string
  size?: "sm" | "md"
}) {
  // `size` is kept for callers; both now follow the pointer, not the width:
  // 40px for a mouse, 44px on touch.
  void size
  const buttonSize = "size-10 [@media(pointer:coarse)]:size-11"
  return (
    <div
      role="group"
      className="flex w-fit max-w-full items-center rounded-xl border border-border bg-card p-0.5"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={onPrevious}
        className={cn(
          "flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          buttonSize,
        )}
        aria-label="Previous month"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      <span
        className="min-w-32 px-1 text-center text-sm font-semibold tabular-nums sm:px-2"
        aria-live="polite"
      >
        {label}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className={cn(
          "flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-30",
          buttonSize,
        )}
        aria-label="Next month"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}

export function FinanceErrorState({
  title,
  description,
  onRetry,
}: {
  title: string
  description: string
  onRetry: () => void
}) {
  return (
    <div
      className="flex flex-col items-start gap-4 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 sm:p-5"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
        <div>
          <p className="text-base font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" className="min-h-11" onClick={onRetry}>
        <RefreshCw aria-hidden="true" />
        Try again
      </Button>
    </div>
  )
}

export function FinanceEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 py-8 text-center sm:px-6 sm:py-10">
      <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

/**
 * The oversized currency entry every amount-taking sheet opens on. Owns the
 * numeral treatment, the native spinner suppression, and a focus ring drawn on
 * the wrapper so the symbol and the digits highlight as one control.
 */
export function AmountField({
  symbol,
  className,
  ...props
}: React.ComponentProps<"input"> & { symbol: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 transition-shadow focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
      <span className="text-2xl font-semibold text-muted-foreground" aria-hidden="true">
        {symbol}
      </span>
      <input
        type="number"
        className={cn(
          "w-full min-w-0 bg-transparent font-mono text-[clamp(1.75rem,9vw,2.25rem)] font-semibold tracking-[-0.035em] tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          className,
        )}
        {...props}
      />
    </div>
  )
}

const METRIC_GRID_COLUMNS: Record<2 | 3 | 4, string | undefined> = {
  2: undefined,
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
}

/**
 * The standard shell for a row of `FinanceMetricCard`s (and their loading
 * skeletons). Owns the responsive column steps so retuning them is one edit
 * rather than a sweep across every Finance summary.
 */
export function FinanceMetricGrid({
  columns = 4,
  className,
  children,
}: {
  columns?: 2 | 3 | 4
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 xs:grid-cols-2",
        METRIC_GRID_COLUMNS[columns],
        className,
      )}
    >
      {children}
    </div>
  )
}
