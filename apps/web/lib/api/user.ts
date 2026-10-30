import { supabase } from "@/lib/supabase"
import { getUserEmail, requireUserId } from "@/lib/auth-store"
import { recommendLevel, type CategoryEvidence } from "@/lib/learning/level-engine"
import { skillsApi } from "./skills"

// User profile over kori_profiles (snake_case columns mapped to the camelCase
// shapes the pages already consume). Avatars live in the public `kori-avatars`
// storage bucket under <user_id>/avatar.

export interface SearchUser {
  id: string
  displayName: string | null
  email: string | null
  avatarUrl: string | null
}

type ProfileRow = {
  id: string
  display_name: string | null
  korean_level: string | null
  country: string | null
  native_language: string | null
  occupation: string | null
  years_of_experience: number | null
  learning_goal: string | null
  study_reminders_enabled: boolean
  study_reminder_hour: number | null
  holiday_alerts_enabled: boolean | null
  avatar_url: string | null
}

function toCamel(row: ProfileRow | null) {
  return {
    id: row?.id ?? null,
    displayName: row?.display_name ?? null,
    email: getUserEmail(),
    koreanLevel: row?.korean_level ?? "BEGINNER",
    country: row?.country ?? null,
    nativeLanguage: row?.native_language ?? null,
    occupation: row?.occupation ?? null,
    yearsOfExperience: row?.years_of_experience ?? null,
    learningGoal: row?.learning_goal ?? null,
    studyRemindersEnabled: row?.study_reminders_enabled ?? false,
    studyReminderHour: row?.study_reminder_hour ?? 20,
    holidayAlertsEnabled: row?.holiday_alerts_enabled ?? false,
    hasProfileImage: Boolean(row?.avatar_url),
    avatarUrl: row?.avatar_url ?? null,
  }
}

export const userApi = {
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from("kori_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle()
    if (error) throw error
    return toCamel(data as ProfileRow | null)
  },

  // Goal-sharing user lookup — reuses Orbit's search_users_profile RPC (matches
  // display names in the shared user_profiles table, excludes the caller).
  search: async (query: string): Promise<SearchUser[]> => {
    const { data, error } = await supabase.rpc("search_users_profile", {
      p_query: query,
      p_limit: 10,
    })
    if (error) throw error
    type Row = {
      id: string
      display_name?: string | null
      email?: string | null
      avatar_url?: string | null
    }
    return ((data ?? []) as Row[]).map((u) => ({
      id: u.id,
      displayName: u.display_name ?? null,
      email: u.email ?? null,
      avatarUrl: u.avatar_url ?? null,
    }))
  },

  updateProfile: async (
    id: string,
    data: {
      displayName: string
      koreanLevel: string
      country?: string
      nativeLanguage?: string
      occupation?: string
      yearsOfExperience?: number
      learningGoal?: string
    },
  ) => {
    const { error } = await supabase.from("kori_profiles").upsert({
      id,
      display_name: data.displayName,
      korean_level: data.koreanLevel,
      country: data.country ?? null,
      native_language: data.nativeLanguage ?? null,
      occupation: data.occupation ?? null,
      years_of_experience: data.yearsOfExperience ?? null,
      learning_goal: data.learningGoal ?? null,
    })
    if (error) throw error
  },

  // Partial upsert (only these two columns) so it's safe to call for a
  // brand-new profile row without clobbering fields the full-form
  // updateProfile() above would otherwise null out.
  completeOnboarding: async (id: string, data: { koreanLevel: string; learningGoal: string }) => {
    const { error } = await supabase.from("kori_profiles").upsert({
      id,
      korean_level: data.koreanLevel,
      learning_goal: data.learningGoal,
    })
    if (error) throw error
  },

  updateStudyReminders: async (id: string, enabled: boolean, hour: number) => {
    const { error } = await supabase
      .from("kori_profiles")
      .update({ study_reminders_enabled: enabled, study_reminder_hour: hour })
      .eq("id", id)
    if (error) throw error
  },

  // Sent at a fixed 6 PM Asia/Seoul (server-side, kori_send_holiday_reminders) —
  // no per-user hour here, unlike study reminders.
  updateHolidayAlerts: async (id: string, enabled: boolean) => {
    const { error } = await supabase
      .from("kori_profiles")
      .update({ holiday_alerts_enabled: enabled })
      .eq("id", id)
    if (error) throw error
  },

  uploadProfileImage: async (id: string, file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const path = `${id}/avatar.${ext}`
    const { error } = await supabase.storage
      .from("kori-avatars")
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) throw error
    const { data } = supabase.storage.from("kori-avatars").getPublicUrl(path)
    // Cache-bust so the <img> refreshes after re-upload of the same path.
    const url = `${data.publicUrl}?v=${Date.now()}`
    const { error: profileError } = await supabase
      .from("kori_profiles")
      .upsert({ id, avatar_url: url })
    if (profileError) throw profileError
    return url
  },

  getProfileImageUrl: async (id: string): Promise<string> => {
    const { data, error } = await supabase
      .from("kori_profiles")
      .select("avatar_url")
      .eq("id", id)
      .maybeSingle()
    if (error) throw error
    if (!data?.avatar_url) throw new Error("No profile image")
    return data.avatar_url
  },
}

export interface LevelSuggestion {
  currentLevel: string
  suggestedLevel: string | null
  upgradeAvailable: boolean
  reason: string
  streakDays: number
  wordsSaved: number
  avgVocabMastery: number
  avgCorrectionRating: number
}

// Aggregates kori_skill_mastery rows (skill_code prefix) into one weighted
// evidence bucket: attempts = sum, averageScore = attempts-weighted mean.
function aggregateCategory(
  rows: Array<{ skillCode: string; masteryScore: number; attemptCount: number }>,
  prefix: string,
): CategoryEvidence {
  const matching = rows.filter((r) => r.skillCode.startsWith(prefix))
  const attempts = matching.reduce((s, r) => s + r.attemptCount, 0)
  if (attempts === 0) return { attempts: 0, averageScore: 0 }
  const averageScore = matching.reduce((s, r) => s + r.masteryScore * r.attemptCount, 0) / attempts
  return { attempts, averageScore: Math.round(averageScore) }
}

// Suggests leveling BEGINNER -> INTERMEDIATE -> ADVANCED from real,
// multicategory skill-mastery evidence (lib/learning/level-engine.ts) —
// vocabulary alone used to decide this. Never downgrades; the learner must
// still manually accept the suggestion via apply().
export const levelApi = {
  getSuggestion: async (): Promise<LevelSuggestion> => {
    const [{ data: profile }, { data: vocab }, mastery] = await Promise.all([
      supabase.from("kori_profiles").select("korean_level").maybeSingle(),
      supabase.from("kori_vocab_cards").select("mastery"),
      skillsApi.getMastery().catch(() => []),
    ])
    const currentLevel = profile?.korean_level ?? "BEGINNER"
    const words = vocab ?? []
    const avgVocabMastery = words.length
      ? words.reduce((s, w) => s + (w.mastery ?? 0), 0) / words.length
      : 0

    const recommendation = recommendLevel({
      currentLevel,
      vocabulary: aggregateCategory(mastery, "vocabulary."),
      grammar: aggregateCategory(mastery, "grammar."),
      listening: aggregateCategory(mastery, "listening."),
      speaking: aggregateCategory(mastery, "speaking."),
      workplaceCommunication: aggregateCategory(mastery, "communication."),
    })

    return {
      currentLevel,
      suggestedLevel: recommendation.suggestedLevel,
      upgradeAvailable: recommendation.upgradeAvailable,
      reason: recommendation.reason,
      streakDays: 0,
      wordsSaved: words.length,
      avgVocabMastery: Math.round(avgVocabMastery),
      avgCorrectionRating: 0,
    }
  },
  apply: async (level: string) => {
    const { error } = await supabase
      .from("kori_profiles")
      .upsert({ id: requireUserId(), korean_level: level })
    if (error) throw error
  },
}

