import "server-only";
import { sql } from "@/lib/db";
import type { FinancePreferences } from "@/types/finance";

interface BudgetWarningThresholdsRow {
  first?: number;
  strong?: number;
  over?: number;
}

interface QuietHoursRow {
  enabled?: boolean;
  start?: string;
  end?: string;
}

// What the scheduled jobs need, which is not the same set the Settings screen
// edits — quiet hours and the last-sent markers have no UI, and the report
// channel toggles are read but never written here. Kept separate from
// FinancePreferences so the client-facing type doesn't grow fields the client
// has no use for.
export interface CronPreferences {
  budgetWatchThresholdPct: number;
  budgetNearLimitThresholdPct: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  weeklyReviewEnabled: boolean;
  monthlyReviewEnabled: boolean;
  monthlyReportChannelTelegram: boolean;
  weeklyReportLastSentWeek: string | null;
  monthlyReportLastSentMonth: string | null;
}

const DEFAULT_CRON_PREFERENCES: CronPreferences = {
  budgetWatchThresholdPct: 70,
  budgetNearLimitThresholdPct: 90,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  weeklyReviewEnabled: true,
  monthlyReviewEnabled: true,
  monthlyReportChannelTelegram: true,
  weeklyReportLastSentWeek: null,
  monthlyReportLastSentMonth: null,
};

export async function findCronPreferences(userId: string): Promise<CronPreferences> {
  const rows = (await sql`
    select budget_warning_thresholds, quiet_hours, weekly_review_enabled, monthly_review_enabled,
      monthly_report_channel_telegram, weekly_report_last_sent_week, monthly_report_last_sent_month
    from finance_preferences where user_id = ${userId}
  `) as {
    budget_warning_thresholds: BudgetWarningThresholdsRow | null;
    quiet_hours: QuietHoursRow | null;
    weekly_review_enabled: boolean;
    monthly_review_enabled: boolean;
    monthly_report_channel_telegram: boolean;
    weekly_report_last_sent_week: string | null;
    monthly_report_last_sent_month: string | null;
  }[];

  const row = rows[0];
  if (!row) return DEFAULT_CRON_PREFERENCES;

  return {
    budgetWatchThresholdPct: Number(row.budget_warning_thresholds?.first ?? DEFAULT_CRON_PREFERENCES.budgetWatchThresholdPct),
    budgetNearLimitThresholdPct: Number(
      row.budget_warning_thresholds?.strong ?? DEFAULT_CRON_PREFERENCES.budgetNearLimitThresholdPct
    ),
    quietHoursEnabled: row.quiet_hours?.enabled ?? DEFAULT_CRON_PREFERENCES.quietHoursEnabled,
    quietHoursStart: row.quiet_hours?.start ?? DEFAULT_CRON_PREFERENCES.quietHoursStart,
    quietHoursEnd: row.quiet_hours?.end ?? DEFAULT_CRON_PREFERENCES.quietHoursEnd,
    weeklyReviewEnabled: row.weekly_review_enabled,
    monthlyReviewEnabled: row.monthly_review_enabled,
    monthlyReportChannelTelegram: row.monthly_report_channel_telegram,
    weeklyReportLastSentWeek: row.weekly_report_last_sent_week,
    monthlyReportLastSentMonth: row.monthly_report_last_sent_month,
  };
}

export type ReportType = "weekly" | "monthly";
export type ReportChannel = "telegram" | "email";

// The two pre-011 columns are the Telegram markers — every value ever written
// to them came from a Telegram send. See 011_finance_report_email_delivery.sql
// for why they were not renamed.
const MARKER_COLUMNS: Record<ReportType, Record<ReportChannel, string>> = {
  weekly: {
    telegram: "weekly_report_last_sent_week",
    email: "weekly_report_email_last_sent_week",
  },
  monthly: {
    telegram: "monthly_report_last_sent_month",
    email: "monthly_report_email_last_sent_month",
  },
};

/**
 * Records that one report type reached one channel for one period.
 *
 * Per channel, so a Telegram success can't suppress an email retry (or the
 * reverse). The column name comes from the literal map above, never from the
 * caller, so it cannot carry injected SQL.
 *
 * finance_preferences.user_id is the primary key, so ON CONFLICT is safe. A
 * user who has never opened Settings has no row yet, and the scheduler must
 * still be able to record what it sent them.
 */
export async function markReportSent(
  userId: string,
  type: ReportType,
  channel: ReportChannel,
  period: string
): Promise<void> {
  const column = MARKER_COLUMNS[type][channel];
  await sql.query(
    `insert into finance_preferences (user_id, ${column})
     values ($1, $2)
     on conflict (user_id) do update set ${column} = $2, updated_at = now()`,
    [userId, period]
  );
}

/** One row per user who could receive a scheduled report on some channel. */
export interface ReportRecipient {
  userId: string;
  /** Supabase account email from Neon `users`; the fallback recipient. */
  accountEmail: string;
  /** null when Telegram was never linked. */
  chatId: string | null;
  weeklyEnabled: boolean;
  monthlyEnabled: boolean;
  monthlyTelegramEnabled: boolean;
  weeklyEmailEnabled: boolean;
  monthlyEmailEnabled: boolean;
  weeklyTelegramSentWeek: string | null;
  weeklyEmailSentWeek: string | null;
  monthlyTelegramSentMonth: string | null;
  monthlyEmailSentMonth: string | null;
}

/**
 * Everyone the report jobs should consider.
 *
 * Deliberately NOT sourced from telegram_accounts: a user who enabled email
 * reports but never linked Telegram must still be reached. Users with neither
 * a preferences row nor a linked chat are excluded — there is no channel to
 * deliver on and no preference to honor.
 *
 * A missing preferences row means defaults, matching findPreferences().
 */
export async function findReportRecipients(): Promise<ReportRecipient[]> {
  const rows = (await sql`
    select
      u.id as user_id,
      u.email as account_email,
      t.chat_id,
      coalesce(p.weekly_review_enabled, true) as weekly_enabled,
      coalesce(p.monthly_review_enabled, true) as monthly_enabled,
      coalesce(p.monthly_report_channel_telegram, true) as monthly_telegram_enabled,
      coalesce(p.weekly_report_channel_email, false) as weekly_email_enabled,
      coalesce(p.monthly_report_channel_email, false) as monthly_email_enabled,
      p.weekly_report_last_sent_week,
      p.weekly_report_email_last_sent_week,
      p.monthly_report_last_sent_month,
      p.monthly_report_email_last_sent_month
    from users u
    left join finance_preferences p on p.user_id = u.id
    left join telegram_accounts t on t.user_id = u.id
    where t.chat_id is not null or p.user_id is not null
    order by u.id
  `) as {
    user_id: string;
    account_email: string;
    chat_id: string | null;
    weekly_enabled: boolean;
    monthly_enabled: boolean;
    monthly_telegram_enabled: boolean;
    weekly_email_enabled: boolean;
    monthly_email_enabled: boolean;
    weekly_report_last_sent_week: string | null;
    weekly_report_email_last_sent_week: string | null;
    monthly_report_last_sent_month: string | null;
    monthly_report_email_last_sent_month: string | null;
  }[];

  return rows.map((row) => ({
    userId: row.user_id,
    accountEmail: row.account_email,
    chatId: row.chat_id,
    weeklyEnabled: row.weekly_enabled,
    monthlyEnabled: row.monthly_enabled,
    monthlyTelegramEnabled: row.monthly_telegram_enabled,
    weeklyEmailEnabled: row.weekly_email_enabled,
    monthlyEmailEnabled: row.monthly_email_enabled,
    weeklyTelegramSentWeek: row.weekly_report_last_sent_week,
    weeklyEmailSentWeek: row.weekly_report_email_last_sent_week,
    monthlyTelegramSentMonth: row.monthly_report_last_sent_month,
    monthlyEmailSentMonth: row.monthly_report_email_last_sent_month,
  }));
}

const DEFAULT_PREFERENCES: FinancePreferences = {
  monthlySpendingLimitKrw: null,
  targetSavingsRate: 20,
  essentialTargetPct: 50,
  budgetWatchThresholdPct: 70,
  budgetNearLimitThresholdPct: 90,
  monthlyReviewEnabled: true,
  financeReportEmail: null,
  weeklyReportEmailEnabled: false,
  monthlyReportEmailEnabled: false,
};

export async function findPreferences(userId: string): Promise<FinancePreferences> {
  const rows = (await sql`
    select monthly_spending_limit_krw, target_savings_rate, essential_target_pct, budget_warning_thresholds,
      monthly_review_enabled, finance_report_email, weekly_report_channel_email, monthly_report_channel_email
    from finance_preferences where user_id = ${userId}
  `) as {
    monthly_spending_limit_krw: string | null;
    target_savings_rate: string;
    essential_target_pct: string;
    budget_warning_thresholds: BudgetWarningThresholdsRow | null;
    monthly_review_enabled: boolean;
    finance_report_email: string | null;
    weekly_report_channel_email: boolean;
    monthly_report_channel_email: boolean;
  }[];

  if (!rows[0]) return DEFAULT_PREFERENCES;

  const thresholds = rows[0].budget_warning_thresholds;
  return {
    monthlySpendingLimitKrw: rows[0].monthly_spending_limit_krw !== null ? Number(rows[0].monthly_spending_limit_krw) : null,
    targetSavingsRate: Number(rows[0].target_savings_rate),
    essentialTargetPct: Number(rows[0].essential_target_pct),
    budgetWatchThresholdPct: Number(thresholds?.first ?? DEFAULT_PREFERENCES.budgetWatchThresholdPct),
    budgetNearLimitThresholdPct: Number(thresholds?.strong ?? DEFAULT_PREFERENCES.budgetNearLimitThresholdPct),
    monthlyReviewEnabled: rows[0].monthly_review_enabled,
    financeReportEmail: rows[0].finance_report_email,
    weeklyReportEmailEnabled: rows[0].weekly_report_channel_email,
    monthlyReportEmailEnabled: rows[0].monthly_report_channel_email,
  };
}

export async function upsertPreferences(
  userId: string,
  input: {
    monthlySpendingLimitKrw?: number | null;
    targetSavingsRate?: number;
    essentialTargetPct?: number;
    budgetWatchThresholdPct?: number;
    budgetNearLimitThresholdPct?: number;
    monthlyReviewEnabled?: boolean;
    financeReportEmail?: string | null;
    weeklyReportEmailEnabled?: boolean;
    monthlyReportEmailEnabled?: boolean;
  }
): Promise<FinancePreferences> {
  const existing = (await sql`
    select budget_warning_thresholds from finance_preferences where user_id = ${userId}
  `) as { budget_warning_thresholds: BudgetWarningThresholdsRow | null }[];

  const needsThresholdUpdate = input.budgetWatchThresholdPct !== undefined || input.budgetNearLimitThresholdPct !== undefined;
  const currentThresholds = existing[0]?.budget_warning_thresholds;
  const nextThresholds = needsThresholdUpdate
    ? {
        first: input.budgetWatchThresholdPct ?? currentThresholds?.first ?? DEFAULT_PREFERENCES.budgetWatchThresholdPct,
        strong: input.budgetNearLimitThresholdPct ?? currentThresholds?.strong ?? DEFAULT_PREFERENCES.budgetNearLimitThresholdPct,
        over: 100,
      }
    : undefined;

  if (existing.length > 0) {
    const sets: string[] = [];
    const params: unknown[] = [userId];
    const set = (column: string, value: unknown) => {
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    };
    if (input.monthlySpendingLimitKrw !== undefined) set("monthly_spending_limit_krw", input.monthlySpendingLimitKrw);
    if (input.targetSavingsRate !== undefined) set("target_savings_rate", input.targetSavingsRate);
    if (input.essentialTargetPct !== undefined) set("essential_target_pct", input.essentialTargetPct);
    if (nextThresholds) set("budget_warning_thresholds", JSON.stringify(nextThresholds));
    if (input.monthlyReviewEnabled !== undefined) set("monthly_review_enabled", input.monthlyReviewEnabled);
    if (input.financeReportEmail !== undefined) set("finance_report_email", input.financeReportEmail);
    if (input.weeklyReportEmailEnabled !== undefined) set("weekly_report_channel_email", input.weeklyReportEmailEnabled);
    if (input.monthlyReportEmailEnabled !== undefined) set("monthly_report_channel_email", input.monthlyReportEmailEnabled);
    sets.push("updated_at = now()");

    await sql.query(`update finance_preferences set ${sets.join(", ")} where user_id = $1`, params);
  } else {
    await sql`
      insert into finance_preferences (
        user_id, monthly_spending_limit_krw, target_savings_rate, essential_target_pct, budget_warning_thresholds,
        monthly_review_enabled, finance_report_email, weekly_report_channel_email, monthly_report_channel_email
      )
      values (
        ${userId}, ${input.monthlySpendingLimitKrw ?? null}, ${input.targetSavingsRate ?? DEFAULT_PREFERENCES.targetSavingsRate},
        ${input.essentialTargetPct ?? DEFAULT_PREFERENCES.essentialTargetPct},
        ${JSON.stringify(
          nextThresholds ?? { first: DEFAULT_PREFERENCES.budgetWatchThresholdPct, strong: DEFAULT_PREFERENCES.budgetNearLimitThresholdPct, over: 100 }
        )},
        ${input.monthlyReviewEnabled ?? DEFAULT_PREFERENCES.monthlyReviewEnabled},
        ${input.financeReportEmail ?? null},
        ${input.weeklyReportEmailEnabled ?? DEFAULT_PREFERENCES.weeklyReportEmailEnabled},
        ${input.monthlyReportEmailEnabled ?? DEFAULT_PREFERENCES.monthlyReportEmailEnabled}
      )
    `;
  }

  return findPreferences(userId);
}
