import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const WIDTHS = {
  lg: "max-w-lg",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
} as const

/**
 * Placeholder for a recovery page while its records load. Mirrors the real
 * layout (back link, kicker + title + intro, then cards) at the page's own
 * width so content swaps in without the screen jumping or flashing blank.
 */
export function RecoveryPageSkeleton({
  width = "3xl",
  header = true,
  cards = 2,
}: {
  width?: keyof typeof WIDTHS
  /** False for full-screen form pages that have no back link or title block. */
  header?: boolean
  cards?: number
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className={cn("mx-auto space-y-5 pb-14", WIDTHS[width])}
    >
      {header && (
        <>
          <Skeleton className="h-5 w-24 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-28 rounded-md" />
            <Skeleton className="h-7 w-full max-w-sm rounded-md" />
            <Skeleton className="h-4 w-full max-w-xl rounded-md" />
          </div>
        </>
      )}
      {Array.from({ length: cards }, (_, index) => (
        <Skeleton key={index} className={cn("w-full rounded-2xl", index === 0 ? "h-56" : "h-36")} />
      ))}
    </div>
  )
}
