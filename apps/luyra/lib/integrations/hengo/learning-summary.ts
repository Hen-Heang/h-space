import "server-only";

import { getCurrentSupabaseUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  display_name: string | null;
  korean_level: string | null;
  best_vocab_streak: number;
};

type StudyPlan = {
  study_date: string;
  topic_label: string;
  total_focus_seconds: number;
};

export type LearningSummary =
  | { status: "unauthenticated" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      profile: Profile | null;
      vocabularyCount: number;
      reviewsDue: number;
      recentActivityCount: number;
      latestPlan: StudyPlan | null;
    };

export async function getHengoLearningSummary(): Promise<LearningSummary> {
  const user = await getCurrentSupabaseUser();
  if (!user) return { status: "unauthenticated" };

  const supabase = await createClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const [profile, vocabulary, reviews, activity, plan] = await Promise.all([
    supabase
      .from("kori_profiles")
      .select("display_name, korean_level, best_vocab_streak")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("kori_vocab_cards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("kori_vocab_cards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .lte("next_review", now),
    supabase
      .from("kori_activity_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("kori_daily_study_plans")
      .select("study_date, topic_label, total_focus_seconds")
      .eq("user_id", user.id)
      .order("study_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const firstError = [profile.error, vocabulary.error, reviews.error, activity.error, plan.error].find(
    Boolean
  );

  if (firstError) return { status: "error", message: firstError.message };

  return {
    status: "ready",
    profile: profile.data as Profile | null,
    vocabularyCount: vocabulary.count ?? 0,
    reviewsDue: reviews.count ?? 0,
    recentActivityCount: activity.count ?? 0,
    latestPlan: plan.data as StudyPlan | null,
  };
}
