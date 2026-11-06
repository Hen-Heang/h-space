import { supabase } from "@/lib/supabase"
import { requireUserId } from "@/lib/auth-store"
import { dateKeyInTimeZone, DEFAULT_TIME_ZONE } from "@/lib/date-key"
import { DEFAULT_DAILY_GOAL_MINUTES, type KoreanLearningGoal } from "@/lib/korean-coach/schemas"
import {
  buildDailyMission,
  type DailyMissionPlan,
  type MissionContext,
  type MissionItemType,
  type WorkMessageCandidate,
} from "@/lib/learning/mission-engine"
import { EXAM_DATE, isExamActive } from "@/lib/study-plan"
import type { SkillCode } from "@/lib/learning/skills"
import { correctionApi, dailyPhraseApi, scenarioApi } from "./learning"
import { listeningApi } from "./listening"
import { vocabApi } from "./vocab"
import { skillsApi } from "./skills"
import { phrasebookApi } from "./phrasebook"

// Daily mission over kori_daily_missions / kori_daily_mission_items. A
// mission is generated once per (user, Korea-calendar day) and then only
// ever read or have its items' progress refreshed — never regenerated —
// so "today's mission" stays stable across refreshes for the whole day.

export interface MissionItem {
  id: string
  type: MissionItemType
  title: string
  reason: string
  targetCount: number
  referenceIds: string[]
  skillCodes: SkillCode[]
  estimatedMinutes: number
  status: "pending" | "in_progress" | "completed"
  progressCount: number
  completedAt: string | null
}

export interface DailyMission {
  id: string
  dateKey: string
  title: string
  reason: string
  estimatedMinutes: number
  focusSkillCodes: SkillCode[]
  createdAt: string
  items: MissionItem[]
}

type MissionRow = {
  id: string
  mission_date: string
  title: string
  reason: string
  estimated_minutes: number
  focus_skill_codes: string[]
  created_at: string
}

type MissionItemRow = {
  id: string
  item_type: MissionItemType
  title: string
  reason: string
  target_count: number
  reference_ids: string[]
  skill_codes: string[]
  estimated_minutes: number
  status: "pending" | "in_progress" | "completed"
  progress_count: number
  completed_at: string | null
}

function toMissionItem(row: MissionItemRow): MissionItem {
  return {
    id: row.id,
    type: row.item_type,
    title: row.title,
    reason: row.reason,
    targetCount: row.target_count,
    referenceIds: row.reference_ids ?? [],
    skillCodes: (row.skill_codes ?? []) as SkillCode[],
    estimatedMinutes: row.estimated_minutes,
    status: row.status,
    progressCount: row.progress_count,
    completedAt: row.completed_at,
  }
}

function toMission(row: MissionRow, items: MissionItemRow[]): DailyMission {
  return {
    id: row.id,
    dateKey: row.mission_date,
    title: row.title,
    reason: row.reason,
    estimatedMinutes: row.estimated_minutes,
    focusSkillCodes: (row.focus_skill_codes ?? []) as SkillCode[],
    createdAt: row.created_at,
    items: items.map(toMissionItem),
  }
}

async function todayDateKey(): Promise<string> {
  const { data } = await supabase.from("kori_profiles").select("timezone").maybeSingle()
  return dateKeyInTimeZone(new Date(), data?.timezone || DEFAULT_TIME_ZONE)
}

async function fetchMission(userId: string, dateKey: string): Promise<DailyMission | null> {
  const { data: missionRow, error } = await supabase
    .from("kori_daily_missions")
    .select("*")
    .eq("user_id", userId)
    .eq("mission_date", dateKey)
    .maybeSingle()
  if (error) throw error
  if (!missionRow) return null

  const { data: itemRows, error: itemsError } = await supabase
    .from("kori_daily_mission_items")
    .select("*")
    .eq("mission_id", missionRow.id)
    .order("created_at", { ascending: true })
  if (itemsError) throw itemsError

  return toMission(missionRow as MissionRow, (itemRows ?? []) as MissionItemRow[])
}

// Work-message cards plus when each was last answered — only fetched for the
// work focus. Never throws: a failure just means no work item today.
async function loadWorkMessageCandidates(): Promise<WorkMessageCandidate[]> {
  try {
    const cards = await phrasebookApi.getWorkMessageCards()
    if (cards.length === 0) return []
    const { data } = await supabase
      .from("kori_phrase_attempts")
      .select("phrase_id, created_at")
      .eq("practice_mode", "speak")
      .eq("task_completed", true)
      .in(
        "phrase_id",
        cards.map((c) => c.id),
      )
      .order("created_at", { ascending: false })
      .limit(500)
    const latest = new Map<string, string>()
    for (const row of (data ?? []) as Array<{ phrase_id: string; created_at: string }>) {
      if (!latest.has(row.phrase_id)) latest.set(row.phrase_id, row.created_at)
    }
    return cards.map((c) => ({ id: c.id, lastPracticedAt: latest.get(c.id) ?? null }))
  } catch {
    return []
  }
}

async function buildContext(dateKey: string): Promise<MissionContext> {
  const [
    profileRes,
    coachPrefsRes,
    dueVocabulary,
    dueVocabularyCount,
    dueCorrections,
    weakSkills,
    phrase,
    scenarios,
    activity,
    duePhrases,
  ] = await Promise.all([
    supabase.from("kori_profiles").select("korean_level").maybeSingle(),
    // Goal and minute budget both come from the one page that sets them
    // (/korean-coach/preferences) — not kori_profiles.learning_goal, and no
    // longer a localStorage daily target that only that browser could see.
    supabase
      .from("kori_korean_coach_preferences")
      .select("main_goal, daily_practice_goal_minutes")
      .maybeSingle(),
    vocabApi.getDueWords(),
    vocabApi.getDueCount(),
    correctionApi.getDueReviews(),
    skillsApi.getWeakSkills(3),
    dailyPhraseApi.getToday().catch(() => null),
    scenarioApi.getList().catch(() => []),
    supabase
      .from("kori_activity_log")
      .select("feature")
      .order("created_at", { ascending: false })
      .limit(20),
    phrasebookApi.getDuePhrases().catch(() => []),
  ])

  const listeningTopics = await listeningApi.getTopics()
  const learningGoal = (coachPrefsRes.data?.main_goal as KoreanLearningGoal | undefined) ?? null
  const workMessageCandidates =
    learningGoal === "workplace" ? await loadWorkMessageCandidates() : []

  return {
    dateKey,
    koreanLevel: profileRes.data?.korean_level ?? "BEGINNER",
    learningGoal,
    availableMinutes: coachPrefsRes.data?.daily_practice_goal_minutes ?? DEFAULT_DAILY_GOAL_MINUTES,
    dueVocabulary: dueVocabulary.map((v) => ({ id: v.id, term: v.term, meaning: v.meaning })),
    dueVocabularyCount,
    dueCorrections: dueCorrections.map((c) => ({
      id: c.id,
      originalText: c.originalText,
      correctedText: c.correctedText,
    })),
    dueCorrectionsCount: dueCorrections.length,
    duePhrases: duePhrases.map((p) => ({ id: p.id, category: p.category })),
    duePhrasesCount: duePhrases.length,
    weakSkills: weakSkills.map((s) => ({ skillCode: s.skillCode, masteryScore: s.masteryScore })),
    recentFeatures: (activity.data ?? []).map((a) => a.feature),
    recentTopics: [],
    // No per-user exam-date field exists yet — there's only the one fixed
    // K-Specialist date every account shares (same source as
    // ExamCountdownBanner, lib/study-plan.ts), not per-account data. Rather
    // than fabricate personalization or leave this permanently null, key it
    // off whether that shared exam window is actually still active: while
    // it's upcoming/ongoing this lets the `interview` mission type compete
    // like any other candidate, and once it passes (as of 2026-08-29 it
    // already has) this reverts to null and `interview` stops being offered
    // until a future exam cycle updates the constants in lib/study-plan.ts.
    upcomingExam: isExamActive() ? { date: EXAM_DATE, type: "K-Specialist" } : null,
    availableScenarios: scenarios.map((s) => ({ id: s.id, title: s.title, category: s.category })),
    availableListeningTopics: listeningTopics.map((topic) => ({ topic })),
    dailyPhraseLearned: phrase?.learned ?? true,
    workMessageCandidates,
  }
}

function itemRows(plan: DailyMissionPlan, missionId: string, userId: string) {
  return plan.items.map((item) => ({
    mission_id: missionId,
    user_id: userId,
    item_type: item.type,
    title: item.title,
    reason: item.reason,
    target_count: item.targetCount,
    reference_ids: item.referenceIds,
    skill_codes: item.skillCodes,
    estimated_minutes: item.estimatedMinutes,
  }))
}

export const missionsApi = {
  getToday: async (): Promise<DailyMission | null> => {
    const userId = requireUserId()
    const dateKey = await todayDateKey()
    return fetchMission(userId, dateKey)
  },

  // Generates and persists today's mission on first call of the day; every
  // later call the same day returns the exact same persisted rows.
  getOrCreateToday: async (): Promise<DailyMission> => {
    const userId = requireUserId()
    const dateKey = await todayDateKey()
    const existing = await fetchMission(userId, dateKey)
    if (existing) return existing

    const context = await buildContext(dateKey)
    let plan = buildDailyMission(context)

    const { data: missionRow, error: missionError } = await supabase
      .from("kori_daily_missions")
      .insert({
        user_id: userId,
        mission_date: dateKey,
        title: plan.title,
        reason: plan.reason,
        estimated_minutes: plan.estimatedMinutes,
        focus_skill_codes: plan.focusSkillCodes,
        context_snapshot: {
          dueVocabularyCount: context.dueVocabularyCount,
          dueCorrectionsCount: context.dueCorrectionsCount,
          weakSkills: context.weakSkills,
        },
      })
      // Two near-simultaneous requests could both miss the SELECT above and
      // both try to insert — the (user_id, mission_date) unique constraint
      // makes the loser's insert fail; upsert on that key so it becomes a
      // safe no-op merge instead of an error.
      .select("*")
      .single()

    if (missionError) {
      if (missionError.code === "23505") {
        const raceWinner = await fetchMission(userId, dateKey)
        if (raceWinner) return raceWinner
      }
      throw missionError
    }

    if (plan.items.length > 0) {
      let { error: itemsError } = await supabase
        .from("kori_daily_mission_items")
        .insert(itemRows(plan, missionRow.id, userId))
      // 23514 = check_violation: the database doesn't know work_message yet
      // (migration 20261106120000 not applied). Rebuild the same plan without
      // the work focus so today's mission still gets its items.
      if (itemsError?.code === "23514" && plan.items.some((i) => i.type === "work_message")) {
        plan = buildDailyMission({ ...context, workMessageCandidates: [] })
        await supabase
          .from("kori_daily_missions")
          .update({
            title: plan.title,
            reason: plan.reason,
            estimated_minutes: plan.estimatedMinutes,
            focus_skill_codes: plan.focusSkillCodes,
          })
          .eq("id", missionRow.id)
        ;({ error: itemsError } = await supabase
          .from("kori_daily_mission_items")
          .insert(itemRows(plan, missionRow.id, userId)))
      }
      if (itemsError) throw itemsError
    }

    const created = await fetchMission(userId, dateKey)
    if (!created) throw new Error("Failed to load the mission just created")
    return created
  },

  // Re-checks each pending/in-progress item against real evidence and marks
  // it complete where the evidence now exists. Never marks anything complete
  // just because a page was opened.
  refreshProgress: async (): Promise<DailyMission | null> => {
    const userId = requireUserId()
    const mission = await missionsApi.getToday()
    if (!mission) return null

    const pending = mission.items.filter((i) => i.status !== "completed")
    if (pending.length === 0) return mission

    const [dueVocabIds, dueCorrectionIds, phrase, duePhraseIds] = await Promise.all([
      vocabApi
        .getDueCount()
        .then(() => vocabApi.getDueWords())
        .then((rows) => new Set(rows.map((r) => r.id))),
      correctionApi.getDueReviews().then((rows) => new Set(rows.map((r) => r.id))),
      dailyPhraseApi.getToday().catch(() => null),
      phrasebookApi
        .getDuePhrases()
        .then((rows) => new Set(rows.map((r) => r.id)))
        .catch(() => new Set<string>()),
    ])

    for (const item of pending) {
      let completed = false
      let progressCount = item.progressCount

      if (item.type === "vocab_review") {
        const stillDue = item.referenceIds.filter((id) => dueVocabIds.has(id))
        progressCount = item.referenceIds.length - stillDue.length
        completed = item.referenceIds.length > 0 && stillDue.length === 0
      } else if (item.type === "correction_review") {
        const stillDue = item.referenceIds.filter((id) => dueCorrectionIds.has(id))
        progressCount = item.referenceIds.length - stillDue.length
        completed = item.referenceIds.length > 0 && stillDue.length === 0
      } else if (item.type === "daily_phrase") {
        completed = Boolean(phrase?.learned)
        progressCount = completed ? 1 : 0
      } else if (item.type === "phrase_review") {
        // Evidence is either a saved SRS review grade (the card left the due
        // set) or a listening/speaking attempt that was actually completed —
        // never just having opened the practice page.
        const stillDue = item.referenceIds.filter((id) => duePhraseIds.has(id))
        let reviewedCount = item.referenceIds.length - stillDue.length
        if (reviewedCount < item.targetCount && item.referenceIds.length > 0) {
          const { data: attemptRows } = await supabase
            .from("kori_phrase_attempts")
            .select("phrase_id")
            .eq("user_id", userId)
            .eq("task_completed", true)
            .in("phrase_id", item.referenceIds)
            .gte("created_at", mission.createdAt)
          const engaged = new Set((attemptRows ?? []).map((r) => r.phrase_id as string))
          const reviewedIds = item.referenceIds.filter((id) => !duePhraseIds.has(id))
          reviewedCount = new Set([...reviewedIds, ...engaged]).size
        }
        progressCount = reviewedCount
        completed = item.referenceIds.length > 0 && reviewedCount >= item.targetCount
      } else if (item.type === "scenario") {
        const scenarioId = item.referenceIds[0]
        if (scenarioId) {
          const { data } = await supabase
            .from("kori_scenario_sessions")
            .select("id")
            .eq("user_id", userId)
            .eq("scenario_id", scenarioId)
            .eq("task_completed", true)
            .gte("started_at", mission.createdAt)
            .limit(1)
          completed = Boolean(data && data.length > 0)
          progressCount = completed ? 1 : 0
        }
      } else if (item.type === "listening") {
        const topic = item.referenceIds[0]
        if (topic) {
          // Curated lessons are created ahead of time, so completion evidence
          // must be the learner's attempt time, not the lesson's creation time.
          const { data: lessons } = await supabase
            .from("kori_listening_lessons")
            .select("id")
            .eq("topic", topic)
          const lessonIds = (lessons ?? []).map((l) => l.id as string)
          if (lessonIds.length > 0) {
            const { data: attempts } = await supabase
              .from("kori_listening_attempts")
              .select("id")
              .eq("user_id", userId)
              .in("lesson_id", lessonIds)
              .gte("created_at", mission.createdAt)
              .limit(1)
            completed = Boolean(attempts && attempts.length > 0)
            progressCount = completed ? 1 : 0
          }
        }
      } else if (item.type === "work_message") {
        // Evidence: a reply to the referenced card graded since the mission
        // was made (typed or spoken — kept distinct in the attempt's
        // input_method). Opening the page or pressing Play is not evidence.
        const phraseId = item.referenceIds[0]
        if (phraseId) {
          const { data: attempts } = await supabase
            .from("kori_phrase_attempts")
            .select("id")
            .eq("user_id", userId)
            .eq("phrase_id", phraseId)
            .eq("practice_mode", "speak")
            .eq("task_completed", true)
            .gte("created_at", mission.createdAt)
            .limit(1)
          completed = Boolean(attempts && attempts.length > 0)
          if (!completed) {
            // The card was deleted or archived after the mission was built:
            // any graded reply today counts, so the step can still be finished.
            const { data: card } = await supabase
              .from("kori_phrase_cards")
              .select("id, active")
              .eq("id", phraseId)
              .maybeSingle()
            if (!card || card.active === false) {
              const { data: anyReply } = await supabase
                .from("kori_phrase_attempts")
                .select("id")
                .eq("user_id", userId)
                .eq("practice_mode", "speak")
                .eq("task_completed", true)
                .gte("created_at", mission.createdAt)
                .limit(1)
              completed = Boolean(anyReply && anyReply.length > 0)
            }
          }
          progressCount = completed ? 1 : 0
        }
      } else if (item.type === "interview") {
        const { data: attempts } = await supabase
          .from("kori_interview_attempts")
          .select("id")
          .gte("created_at", mission.createdAt)
          .limit(1)
        completed = Boolean(attempts && attempts.length > 0)
        progressCount = completed ? 1 : 0
      }

      if (completed || progressCount !== item.progressCount) {
        await supabase
          .from("kori_daily_mission_items")
          .update({
            status: completed ? "completed" : "in_progress",
            progress_count: progressCount,
            completed_at: completed ? new Date().toISOString() : null,
          })
          .eq("id", item.id)
      }
    }

    return fetchMission(userId, mission.dateKey)
  },

  // Directly completes one item with explicit evidence (used by flows that
  // already know they just satisfied it — e.g. a scenario evaluation result)
  // rather than waiting for the next refreshProgress() poll.
  completeItemWithEvidence: async (
    itemId: string,
    evidence: Record<string, unknown> = {},
  ): Promise<void> => {
    const { error } = await supabase
      .from("kori_daily_mission_items")
      .update({
        status: "completed",
        progress_count: 1,
        completed_at: new Date().toISOString(),
        evidence,
      })
      .eq("id", itemId)
    if (error) throw error
  },
}
