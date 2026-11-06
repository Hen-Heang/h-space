import type { MissionItem } from "@/lib/api"
import type { MissionItemType } from "@/lib/learning/mission-engine"

// Shared presentation mapping for a DailyMission item, used by both the
// compact /home mission card and the focused /practice session — one place
// so the two surfaces can never describe the same item differently. Icons
// live separately in components/practice/MissionItemIcon.tsx — a real
// component, not a value returned from a plain function, since assigning a
// component reference from a function call inside another component's render
// trips the React Compiler's "components created during render" check.

export function missionItemLabel(type: MissionItemType): string {
  const byType: Record<MissionItemType, string> = {
    vocab_review: "Vocabulary",
    correction_review: "Mistake retry",
    phrase_review: "Phrase review",
    daily_phrase: "Daily phrase",
    listening: "Listening",
    scenario: "Speaking",
    interview: "Mock interview",
    work_message: "Work message",
  }
  return byType[type]
}

/** Short, itemized summary line — "5 words to review", "1 listening activity". */
export function missionItemSummary(item: MissionItem): string {
  const n = item.targetCount || 1
  const plural = (noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`
  const byType: Record<MissionItemType, string> = {
    vocab_review: `${plural("word")} to review`,
    correction_review: `${plural("mistake")} to retry`,
    phrase_review: `${plural("phrase card")} to practice`,
    daily_phrase: "1 phrase to learn",
    listening: "1 listening activity",
    scenario: "1 speaking scenario",
    interview: "1 mock interview",
    work_message: "1 work message to understand and answer",
  }
  return byType[item.type] ?? item.title
}

/** Primary CTA label for a step in the focused practice session. */
export function missionItemCtaLabel(type: MissionItemType): string {
  const byType: Record<MissionItemType, string> = {
    vocab_review: "Review vocabulary",
    correction_review: "Review mistakes",
    phrase_review: "Practice phrases",
    daily_phrase: "Learn today's phrase",
    listening: "Open listening",
    scenario: "Start speaking",
    interview: "Start mock interview",
    work_message: "Practice the work message",
  }
  return byType[type]
}

/**
 * Where a step's CTA leads — every type except "scenario", which needs an
 * async handler (create a conversation + scenario session before navigating,
 * see goToScenario in app/(main)/practice/page.tsx) rather than a plain href.
 */
export function missionItemHref(item: MissionItem): string | null {
  switch (item.type) {
    // Straight into the next review batch (ReviewSession's autoStart), not
    // the long /vocab page with the launch card somewhere on it.
    case "vocab_review":
      return "/vocab?review=session"
    case "daily_phrase":
      return "/vocab?tab=phrases"
    case "correction_review":
      return "/chat?mode=corrections"
    case "listening":
      return `/listening${item.referenceIds[0] ? `?topic=${encodeURIComponent(item.referenceIds[0])}` : ""}`
    case "interview":
      return "/interview"
    case "phrase_review":
      return "/phrasebook/practice?mode=review"
    // The exact card the engine picked, so the step and its evidence match.
    case "work_message":
      return `/phrasebook/practice?mode=work${item.referenceIds[0] ? `&phraseId=${encodeURIComponent(item.referenceIds[0])}` : ""}`
    case "scenario":
      return null
  }
}
