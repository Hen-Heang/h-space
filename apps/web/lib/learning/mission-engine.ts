import {
  skillLabel,
  skillsForListeningTopic,
  skillsForScenarioCategory,
  type SkillCode,
} from "@/lib/learning/skills"
import { KOREAN_LEARNING_GOAL_LABEL, type KoreanLearningGoal } from "@/lib/korean-coach/schemas"

// Deterministic daily-mission selection. No Math.random anywhere — the same
// MissionContext always produces the same DailyMissionPlan, which is what
// lets lib/api/missions.ts persist one mission per (user, dateKey) and have
// it survive a page refresh untouched. Any tie-breaking needed among equally
// good candidates uses a stable hash of dateKey instead of randomness.

export type MissionItemType =
  | "vocab_review"
  | "correction_review"
  | "daily_phrase"
  | "scenario"
  | "listening"
  | "interview"
  | "phrase_review"
  | "work_message"

export interface DueVocabularyItem {
  id: string
  term: string
  meaning: string
}

export interface DueCorrectionItem {
  id: string
  originalText: string
  correctedText: string
}

export interface DuePhraseItem {
  id: string
  category: string
}

export interface SkillMasterySummary {
  skillCode: SkillCode
  masteryScore: number
}

export interface ScenarioCandidate {
  id: string
  title: string
  category: string
}

export interface ListeningCandidate {
  topic: string
}

/** A Phrasebook card with work-message comprehension notes (curated pack or
 *  a message the learner saved), plus when the learner last replied to it. */
export interface WorkMessageCandidate {
  id: string
  /** ISO time of the latest reply attempt, null if never practiced. */
  lastPracticedAt: string | null
}

export interface MissionContext {
  dateKey: string
  koreanLevel: string
  /** The single goal setting (kori_korean_coach_preferences.main_goal). */
  learningGoal: KoreanLearningGoal | null
  availableMinutes: number
  dueVocabulary: DueVocabularyItem[]
  dueVocabularyCount: number
  dueCorrections: DueCorrectionItem[]
  dueCorrectionsCount: number
  duePhrases: DuePhraseItem[]
  duePhrasesCount: number
  weakSkills: SkillMasterySummary[]
  recentFeatures: string[]
  recentTopics: string[]
  upcomingExam: { date: string; type: string } | null
  availableScenarios: ScenarioCandidate[]
  availableListeningTopics: ListeningCandidate[]
  dailyPhraseLearned: boolean
  /**
   * Work-message practice cards. Only used when learningGoal is "workplace"
   * (the "Korean for my work" focus); omitted/empty → no work_message item and
   * exactly the previous behaviour.
   */
  workMessageCandidates?: WorkMessageCandidate[]
}

export interface DailyMissionItemPlan {
  type: MissionItemType
  title: string
  reason: string
  targetCount: number
  referenceIds: string[]
  skillCodes: SkillCode[]
  estimatedMinutes: number
}

export interface DailyMissionPlan {
  dateKey: string
  title: string
  reason: string
  estimatedMinutes: number
  focusSkillCodes: SkillCode[]
  items: DailyMissionItemPlan[]
}

// Stable, seedable pick among equally-ranked candidates — replaces
// Math.random() with something that's the same every time for a given date.
function stableIndex(seed: string, length: number): number {
  if (length <= 0) return 0
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return hash % length
}

function stablePick<T>(items: T[], seed: string): T | null {
  if (items.length === 0) return null
  return items[stableIndex(seed, items.length)]
}

function activityTypeForSkillCategory(code: SkillCode): MissionItemType {
  if (code.startsWith("vocabulary.")) return "vocab_review"
  if (code.startsWith("grammar.") || code.startsWith("communication.")) return "correction_review"
  if (code.startsWith("listening.")) return "listening"
  if (code.startsWith("speaking.")) return "scenario"
  if (code.startsWith("interview.")) return "interview"
  return "scenario"
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`
}

interface Candidate {
  weight: number
  item: DailyMissionItemPlan
}

function buildVocabCandidate(ctx: MissionContext, weight: number): Candidate | null {
  if (ctx.dueVocabularyCount <= 0) return null
  const targetCount = Math.min(ctx.dueVocabularyCount, 20)
  return {
    weight,
    item: {
      type: "vocab_review",
      title: `Review ${plural(ctx.dueVocabularyCount, "vocabulary card")}`,
      reason: `${plural(ctx.dueVocabularyCount, "word")} you saved earlier came due for review today.`,
      targetCount,
      referenceIds: ctx.dueVocabulary.slice(0, targetCount).map((v) => v.id),
      skillCodes: [],
      estimatedMinutes: Math.min(15, Math.max(5, Math.ceil(ctx.dueVocabularyCount / 2))),
    },
  }
}

function buildCorrectionCandidate(ctx: MissionContext, weight: number): Candidate | null {
  if (ctx.dueCorrectionsCount <= 0) return null
  const targetCount = Math.min(ctx.dueCorrectionsCount, 20)
  return {
    weight,
    item: {
      type: "correction_review",
      title: `Clear ${plural(ctx.dueCorrectionsCount, "repeated mistake")}`,
      reason: `${plural(ctx.dueCorrectionsCount, "past mistake")} of yours are due to review again — clearing them keeps them from coming back.`,
      targetCount,
      referenceIds: ctx.dueCorrections.slice(0, targetCount).map((c) => c.id),
      skillCodes: [],
      estimatedMinutes: Math.min(15, Math.max(5, Math.ceil(ctx.dueCorrectionsCount / 2))),
    },
  }
}

function buildPhraseCandidate(ctx: MissionContext, weight: number): Candidate | null {
  if (ctx.duePhrasesCount <= 0) return null
  const targetCount = Math.min(ctx.duePhrasesCount, 10)
  return {
    weight,
    item: {
      type: "phrase_review",
      title: `Review ${plural(ctx.duePhrasesCount, "Phrasebook Q&A card")}`,
      reason: `${plural(ctx.duePhrasesCount, "phrase")} you saved earlier came due for review today.`,
      targetCount,
      referenceIds: ctx.duePhrases.slice(0, targetCount).map((p) => p.id),
      skillCodes: [],
      estimatedMinutes: Math.min(15, Math.max(5, Math.ceil(ctx.duePhrasesCount / 2))),
    },
  }
}

function buildScenarioCandidate(
  ctx: MissionContext,
  weight: number,
  reason: string,
  skillCodes: SkillCode[],
): Candidate | null {
  if (ctx.availableScenarios.length === 0) return null
  const scenario = stablePick(ctx.availableScenarios, ctx.dateKey)
  if (!scenario) return null
  return {
    weight,
    item: {
      type: "scenario",
      title: `Practice: ${scenario.title}`,
      reason,
      targetCount: 1,
      referenceIds: [scenario.id],
      skillCodes,
      estimatedMinutes: 10,
    },
  }
}

function buildListeningCandidate(
  ctx: MissionContext,
  weight: number,
  reason: string,
  skillCodes: SkillCode[],
): Candidate | null {
  if (ctx.availableListeningTopics.length === 0) return null
  const topic = stablePick(ctx.availableListeningTopics, ctx.dateKey)
  if (!topic) return null
  return {
    weight,
    item: {
      type: "listening",
      title: `Listening: ${topic.topic}`,
      reason,
      targetCount: 1,
      referenceIds: [topic.topic],
      skillCodes,
      estimatedMinutes: 10,
    },
  }
}

function buildInterviewCandidate(
  weight: number,
  reason: string,
  skillCodes: SkillCode[],
): Candidate {
  return {
    weight,
    item: {
      type: "interview",
      title: "Mock interview practice",
      reason,
      targetCount: 1,
      referenceIds: [],
      skillCodes,
      estimatedMinutes: 15,
    },
  }
}

function buildWeaknessCandidate(
  ctx: MissionContext,
  alreadyPresent: Set<MissionItemType>,
): Candidate | null {
  const weakest = ctx.weakSkills[0]
  if (!weakest) return null
  const type = activityTypeForSkillCategory(weakest.skillCode)
  // Already covered by a due-SRS item — don't add a duplicate item type, the
  // caller instead folds the weak-skill tag onto the existing candidate.
  if (alreadyPresent.has(type)) return null

  const reason = `Your ${skillLabel(weakest.skillCode)} skill is at ${Math.round(weakest.masteryScore)}% mastery — this practices it directly.`
  if (type === "listening") return buildListeningCandidate(ctx, 0.3, reason, [weakest.skillCode])
  if (type === "interview") {
    // Only steer toward mock-interview practice when there's a real exam to
    // prep for — otherwise fall back to general speaking practice, which
    // exercises the same underlying skill without implying an exam exists.
    if (!ctx.upcomingExam) return buildScenarioCandidate(ctx, 0.3, reason, [weakest.skillCode])
    return buildInterviewCandidate(0.3, reason, [weakest.skillCode])
  }
  return buildScenarioCandidate(ctx, 0.3, reason, [weakest.skillCode])
}

function buildGoalCandidate(
  ctx: MissionContext,
  alreadyPresent: Set<MissionItemType>,
): Candidate | null {
  if (ctx.upcomingExam) {
    if (alreadyPresent.has("interview")) return null
    return buildInterviewCandidate(
      0.2,
      `Your ${ctx.upcomingExam.type} exam is coming up on ${ctx.upcomingExam.date} — keep your interview skills sharp.`,
      ["interview.task_completion"],
    )
  }
  if (ctx.learningGoal) {
    if (alreadyPresent.has("scenario")) return null
    return buildScenarioCandidate(
      ctx,
      0.2,
      `This ties back to your goal: "${KOREAN_LEARNING_GOAL_LABEL[ctx.learningGoal]}".`,
      [],
    )
  }
  return null
}

// ── Work focus ──────────────────────────────────────────────────────────────

/** Minutes for one work message: listen/read, find the action, reply, feedback. */
export const WORK_MESSAGE_MINUTES = 5
/** In work focus a due-review batch is trimmed to fit, but never below this. */
const MIN_FOCUSED_REVIEW_MINUTES = 2
/** Review pace the estimates above already assume (ceil(count / 2) minutes). */
const REVIEW_CARDS_PER_MINUTE = 2
const REVIEW_TYPES = new Set<MissionItemType>([
  "vocab_review",
  "correction_review",
  "phrase_review",
])

/** The work card to practice today: never-practiced first, then the one
 *  practiced longest ago; ties broken by a stable hash of the date. */
export function pickWorkMessage(
  candidates: WorkMessageCandidate[],
  dateKey: string,
): WorkMessageCandidate | null {
  if (candidates.length === 0) return null
  const rank = (c: WorkMessageCandidate) => c.lastPracticedAt ?? ""
  const oldest = candidates.reduce((min, c) => (rank(c) < min ? rank(c) : min), rank(candidates[0]))
  const tied = candidates.filter((c) => rank(c) === oldest).sort((a, b) => a.id.localeCompare(b.id))
  return stablePick(tied, dateKey)
}

function buildWorkMessageCandidate(ctx: MissionContext): Candidate | null {
  if (ctx.learningGoal !== "workplace") return null
  const pick = pickWorkMessage(ctx.workMessageCandidates ?? [], ctx.dateKey)
  if (!pick) return null
  return {
    // Above every SRS/weakness weight, so the one contextual task is placed
    // first and a big review backlog can't crowd it out of the budget.
    weight: 0.9,
    item: {
      type: "work_message",
      title: "Understand and answer a work message",
      reason:
        "Your focus is Korean for work: listen to one message, find what you need to do, and reply in 1–3 sentences.",
      targetCount: 1,
      referenceIds: [pick.id],
      skillCodes: ["listening.workplace", "communication.clarification"],
      estimatedMinutes: WORK_MESSAGE_MINUTES,
    },
  }
}

/** Trims a due-review item to `minutes`, keeping its first cards (the most
 *  overdue — the SRS order). The backlog itself is untouched. */
function trimReview(item: DailyMissionItemPlan, minutes: number): DailyMissionItemPlan {
  if (item.estimatedMinutes <= minutes) return item
  const targetCount = Math.max(1, Math.min(item.targetCount, minutes * REVIEW_CARDS_PER_MINUTE))
  return {
    ...item,
    targetCount,
    referenceIds: item.referenceIds.slice(0, targetCount),
    estimatedMinutes: minutes,
  }
}

const VARIETY_TYPES: MissionItemType[] = [
  "scenario",
  "listening",
  "vocab_review",
  "correction_review",
  "interview",
]

function buildVarietyCandidate(
  ctx: MissionContext,
  alreadyPresent: Set<MissionItemType>,
): Candidate | null {
  // The type that appears least (or not at all) in recent activity. Interview
  // only enters the rotation when there's a real active exam — otherwise
  // "haven't practiced interview in a while" would make it look neglected
  // for every learner who has simply never taken a mock interview.
  const varietyTypes = ctx.upcomingExam
    ? VARIETY_TYPES
    : VARIETY_TYPES.filter((t) => t !== "interview")
  const counts = new Map<MissionItemType, number>()
  for (const type of varietyTypes) counts.set(type, 0)
  for (const feature of ctx.recentFeatures) {
    if (counts.has(feature as MissionItemType))
      counts.set(feature as MissionItemType, (counts.get(feature as MissionItemType) ?? 0) + 1)
  }
  const neglected = [...counts.entries()]
    .filter(([type]) => !alreadyPresent.has(type))
    .sort((a, b) => a[1] - b[1])[0]?.[0]

  if (!neglected) return null
  const reason = "You haven't practiced this in a while — a little variety keeps skills balanced."
  if (neglected === "scenario") return buildScenarioCandidate(ctx, 0.1, reason, [])
  if (neglected === "listening") return buildListeningCandidate(ctx, 0.1, reason, [])
  if (neglected === "interview") return buildInterviewCandidate(0.1, reason, [])
  return null
}

/** Deterministically builds today's mission from real evidence — due SRS
 *  work, measured weak skills, the learner's stated goal/exam, and variety
 *  across recently-neglected features. Same input → same output, always. */
export function buildDailyMission(ctx: MissionContext): DailyMissionPlan {
  const candidates: Candidate[] = []
  const totalDue = ctx.dueVocabularyCount + ctx.dueCorrectionsCount + ctx.duePhrasesCount
  const vocabCandidate = buildVocabCandidate(
    ctx,
    0.4 * (ctx.dueVocabularyCount / Math.max(1, totalDue) || 0.34),
  )
  const correctionCandidate = buildCorrectionCandidate(
    ctx,
    0.4 * (ctx.dueCorrectionsCount / Math.max(1, totalDue) || 0.34),
  )
  const phraseCandidate = buildPhraseCandidate(
    ctx,
    0.4 * (ctx.duePhrasesCount / Math.max(1, totalDue) || 0.34),
  )
  if (vocabCandidate) candidates.push(vocabCandidate)
  if (correctionCandidate) candidates.push(correctionCandidate)
  if (phraseCandidate) candidates.push(phraseCandidate)

  const presentTypes = new Set(candidates.map((c) => c.item.type))
  const weaknessCandidate = buildWeaknessCandidate(ctx, presentTypes)
  if (weaknessCandidate) {
    candidates.push(weaknessCandidate)
    presentTypes.add(weaknessCandidate.item.type)
  } else {
    // Weak skill's activity type is already present as a due-SRS item — fold
    // the weak-skill tag + a bumped weight onto it instead of a duplicate.
    const weakest = ctx.weakSkills[0]
    if (weakest) {
      const type = activityTypeForSkillCategory(weakest.skillCode)
      const existing = candidates.find((c) => c.item.type === type)
      if (existing) {
        existing.weight += 0.3
        existing.item.skillCodes = [...new Set([...existing.item.skillCodes, weakest.skillCode])]
      }
    }
  }

  // Work focus: the work message is the goal-driven task (an active exam's
  // interview practice still takes the goal slot alongside it).
  const workCandidate = buildWorkMessageCandidate(ctx)
  if (workCandidate) {
    candidates.push(workCandidate)
    presentTypes.add("work_message")
  }

  const goalSlotTaken = workCandidate != null && !ctx.upcomingExam
  const goalCandidate = goalSlotTaken ? null : buildGoalCandidate(ctx, presentTypes)
  if (goalCandidate) {
    candidates.push(goalCandidate)
    presentTypes.add(goalCandidate.item.type)
  } else if (!goalSlotTaken) {
    const type = ctx.upcomingExam ? "interview" : "scenario"
    const existing = candidates.find((c) => c.item.type === type)
    if (existing) existing.weight += 0.2
  }

  const varietyCandidate = buildVarietyCandidate(ctx, presentTypes)
  if (varietyCandidate) candidates.push(varietyCandidate)

  candidates.sort((a, b) => b.weight - a.weight)

  // In work focus the due reviews share what the work message leaves of the
  // budget, so the session stays short and still has its contextual task.
  if (workCandidate) {
    const reviews = candidates.filter((c) => REVIEW_TYPES.has(c.item.type))
    if (reviews.length > 0) {
      const share = Math.max(
        MIN_FOCUSED_REVIEW_MINUTES,
        Math.floor((ctx.availableMinutes - WORK_MESSAGE_MINUTES) / reviews.length),
      )
      for (const review of reviews) review.item = trimReview(review.item, share)
    }
  }

  const items: DailyMissionItemPlan[] = []
  let minutesUsed = 0
  for (const candidate of candidates) {
    if (items.length > 0 && minutesUsed + candidate.item.estimatedMinutes > ctx.availableMinutes)
      continue
    items.push(candidate.item)
    minutesUsed += candidate.item.estimatedMinutes
  }

  // Always include the daily phrase if it's not learned yet — near-zero cost,
  // high-value daily habit, independent of the weighted buckets above.
  if (!ctx.dailyPhraseLearned) {
    items.push({
      type: "daily_phrase",
      title: "Learn today's phrase",
      reason: "One small, real workplace phrase a day adds up fast.",
      targetCount: 1,
      referenceIds: [],
      skillCodes: [],
      estimatedMinutes: 3,
    })
    minutesUsed += 3
  }

  if (items.length === 0) {
    items.push({
      type: "scenario",
      title: "Free practice",
      reason: "No due reviews today — use the time for open conversation practice.",
      targetCount: 1,
      referenceIds: ctx.availableScenarios.length > 0 ? [ctx.availableScenarios[0].id] : [],
      skillCodes: [],
      estimatedMinutes: 10,
    })
  }

  const focusSkillCodes = [...new Set(items.flatMap((i) => i.skillCodes))].slice(0, 4)
  const primary = items[0]
  const secondaryReason = items[1]?.reason
  const title = items.length > 1 ? `${primary.title} + ${items.length - 1} more` : primary.title
  const reason = secondaryReason ? `${primary.reason} ${secondaryReason}` : primary.reason

  return {
    dateKey: ctx.dateKey,
    title,
    reason,
    estimatedMinutes: items.reduce((sum, i) => sum + i.estimatedMinutes, 0),
    focusSkillCodes,
    items,
  }
}

// Skill-category → activity-type mapping used by weak-skill selection,
// exported for tests and any caller that needs to know how a skill maps to
// a practicable feature (e.g. scenario/listening topic pickers).
export { activityTypeForSkillCategory, skillsForListeningTopic, skillsForScenarioCategory }
