import { changedRatio, diffText } from "@/lib/learning/text-diff"
import { cn } from "@/lib/utils"

// "What changed" between what the learner said and the corrected sentence:
// removed characters struck through, added ones underlined — each also marked
// with words for screen readers, never by color alone. Renders nothing when
// the texts are identical, too long to diff, or so rewritten (>60% changed)
// that highlights would be noise; callers always keep showing both sentences.
export function CorrectionDiff({
  before,
  after,
  className,
}: {
  before: string
  after: string
  className?: string
}) {
  const original = before.trim()
  const corrected = after.trim()
  if (!original || !corrected || original === corrected) return null
  const segments = diffText(original, corrected)
  if (!segments || changedRatio(segments) > 0.6) return null

  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs font-medium text-muted-foreground">What changed</p>
      <p
        lang="ko"
        className="break-keep text-base leading-8 text-foreground [overflow-wrap:anywhere]"
      >
        {segments.map((segment, index) =>
          segment.type === "same" ? (
            <span key={index}>{segment.text}</span>
          ) : segment.type === "removed" ? (
            <del
              key={index}
              className="rounded-sm bg-red-500/15 px-0.5 text-red-800 decoration-2 dark:text-red-200"
            >
              <span className="sr-only">removed: </span>
              {segment.text}
            </del>
          ) : (
            <ins
              key={index}
              className="rounded-sm bg-emerald-500/15 px-0.5 font-semibold text-emerald-800 underline decoration-2 underline-offset-4 dark:text-emerald-200"
            >
              <span className="sr-only">added: </span>
              {segment.text}
            </ins>
          ),
        )}
      </p>
    </div>
  )
}
