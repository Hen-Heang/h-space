import Link from "next/link"

import { Skeleton } from "@/components/ui/skeleton"
import type { StudyGroupSummary } from "@/lib/learning/skill-groups"

// "Practice score" — five deterministic skill-group averages from
// kori_skill_mastery (see lib/learning/skill-groups.ts), never a percentage
// invented in this component. A group with no practiced skills yet shows
// "Not started" instead of a fabricated 0%.
//
// These are NOT /vocab's "Avg. mastery", and the two will not match. This is
// a running average of how you *scored* on graded practice attempts
// (lib/learning/mastery.ts weights each new attempt against the previous
// average), so grading cards "Good" holds it near 80 from the first session.
// /vocab's number is per-card SRS strength: a 0-100 counter that moves +10 per
// good review, so a barely-started collection sits near 0 no matter how well
// each individual review goes. Both are correct; the caption below says which
// one this is, because "mastery" alone made them look like a contradiction.
export function StudySkillSummary({
  groups,
  loading,
}: {
  groups: StudyGroupSummary[]
  loading: boolean
}) {
  return (
    <section aria-labelledby="skill-summary-heading" className="app-surface p-4 sm:p-5">
      <h2 id="skill-summary-heading" className="text-sm font-semibold text-foreground">
        Practice score
      </h2>
      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
        Average score on graded practice — separate from{" "}
        <Link href="/vocab" className="underline underline-offset-2 hover:text-foreground">
          flashcard strength
        </Link>
        .
      </p>

      {loading ? (
        <div className="mt-3 space-y-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-5 w-full rounded" />
          ))}
        </div>
      ) : (
        <dl className="mt-3 space-y-2.5">
          {groups.map((group) => (
            <div key={group.id} className="grid grid-cols-[6rem_1fr_4.5rem] items-center gap-3">
              <dt className="text-sm text-foreground">{group.label}</dt>
              <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
                {group.hasEvidence && (
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${group.masteryPercent}%` }}
                  />
                )}
              </div>
              <dd className="text-right text-xs font-medium tabular-nums text-muted-foreground">
                {group.hasEvidence ? `${group.masteryPercent}%` : "Not started"}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
