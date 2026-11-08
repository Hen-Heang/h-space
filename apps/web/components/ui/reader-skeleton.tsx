import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Loading placeholder for a single document view (a note, a reading unit, an
 * editor): a title, a metadata line, then paragraph lines — shaped like the
 * page that replaces it, per docs/design-system.md §7, instead of a centred
 * spinner. `label` is announced to screen readers.
 */
export function ReaderSkeleton({
  label,
  variant = "article",
  className,
}: {
  label: string
  /** "form" shows field-shaped blocks instead of paragraph lines. */
  variant?: "article" | "form"
  className?: string
}) {
  return (
    <div role="status" className={cn("mx-auto w-full max-w-3xl space-y-6 py-6", className)}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      {variant === "form" ? (
        <div aria-hidden="true" className="space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className={cn("w-full", i === 2 ? "h-40" : "h-11")} />
            </div>
          ))}
        </div>
      ) : (
        <div aria-hidden="true" className="space-y-3">
          {["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-2/3"].map((width, i) => (
            <Skeleton key={i} className={cn("h-4", width)} />
          ))}
        </div>
      )}
    </div>
  )
}
