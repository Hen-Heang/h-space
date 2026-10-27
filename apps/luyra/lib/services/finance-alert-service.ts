import "server-only";
import { findBudgetAlertState, updateBudgetAlertState } from "@/lib/repositories/finance-budget-repository";
import { findCronPreferences, type CronPreferences } from "@/lib/repositories/finance-preferences-repository";
import { findLinkedAccounts } from "@/lib/repositories/telegram-account-repository";
import {
  sumExpenseByCategoryForRange,
  sumExpenseByDayForRange,
  sumTotalsForRange,
} from "@/lib/repositories/finance-transaction-repository";
import {
  listPushSubscriptionsForUser,
  listUsersWithPushSubscriptions,
} from "@/lib/repositories/push-subscription-repository";
import {
  isPushNotificationConfigured,
  sendPushToSubscriptions,
} from "@/lib/services/push-notification-service";
import { escapeTelegramHtml, isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram/client";
import { appDate, appMinutesOfDay, appMonth, monthStart, nextDate, nextMonthStart } from "@/lib/finance-cron-time";
import { krw } from "@/lib/finance-format";
import type { CronRunResult } from "@/lib/server/cron";

const NOT_CONFIGURED: CronRunResult = { scanned: 0, notified: 0, skipped: "telegram_not_configured" };

function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

// Quiet hours normally wrap midnight (22:00 → 08:00), so "inside the window"
// is an OR when start is after end, and a plain AND when it isn't.
export function isWithinQuietHours(preferences: CronPreferences, now: Date = new Date()): boolean {
  if (!preferences.quietHoursEnabled) return false;

  const start = parseClock(preferences.quietHoursStart);
  const end = parseClock(preferences.quietHoursEnd);
  if (start === null || end === null || start === end) return false;

  const minutes = appMinutesOfDay(now);
  return start > end ? minutes >= start || minutes < end : minutes >= start && minutes < end;
}

const LEVEL_MARKERS: Record<number, string> = { 1: "🟡", 2: "🟠", 3: "🔴" };

export function budgetLevelFor(spentKrw: number, budgetKrw: number, preferences: CronPreferences): number {
  if (budgetKrw <= 0) return 0;
  const pct = (spentKrw / budgetKrw) * 100;
  if (pct >= 100) return 3;
  if (pct >= preferences.budgetNearLimitThresholdPct) return 2;
  if (pct >= preferences.budgetWatchThresholdPct) return 1;
  return 0;
}

/**
 * Daily budget sweep. A category is announced only when it crosses to a HIGHER
 * level than it has already been announced at this month, so a budget sitting
 * at 95% produces one message, not one per day for the rest of the month.
 */
export async function runBudgetAlerts(now: Date = new Date()): Promise<CronRunResult> {
  if (!isTelegramConfigured()) return NOT_CONFIGURED;

  const accounts = await findLinkedAccounts();
  const month = appMonth(now);
  const start = monthStart(month);
  const end = nextMonthStart(month);
  let notified = 0;

  for (const account of accounts) {
    const preferences = await findCronPreferences(account.userId);
    if (isWithinQuietHours(preferences, now)) continue;

    const budgets = await findBudgetAlertState(account.userId);
    if (budgets.length === 0) continue;

    const spendByCategory = new Map(
      (await sumExpenseByCategoryForRange(account.userId, start, end))
        .filter((row) => row.categoryId !== null)
        .map((row) => [row.categoryId as string, row.amountKrw])
    );

    const lines: string[] = [];
    const crossed: { id: string; level: number }[] = [];
    for (const budget of budgets) {
      const spent = spendByCategory.get(budget.categoryId) ?? 0;
      const level = budgetLevelFor(spent, budget.amountKrw, preferences);
      // A stored level from an earlier month says nothing about this one.
      const announced = budget.alertMonth === month ? budget.alertLevel : 0;
      if (level <= announced) continue;

      const pct = Math.round((spent / budget.amountKrw) * 100);
      lines.push(
        `${LEVEL_MARKERS[level]} ${escapeTelegramHtml(budget.categoryName)}: ${pct}% — ${krw.format(spent)} of ${krw.format(budget.amountKrw)}`
      );
      crossed.push({ id: budget.id, level });
    }

    if (lines.length === 0) continue;

    const message = ["💸 <b>Budget alert</b>", "", ...lines].join("\n");
    // Record the announced level only once the message is actually delivered.
    // Writing it earlier means a failed send still suppresses the category for
    // the rest of the month — the alert is lost rather than retried tomorrow.
    if (!(await sendTelegramMessage(account.chatId, message))) continue;

    for (const { id, level } of crossed) {
      await updateBudgetAlertState(id, month, level);
    }
    notified += 1;
  }

  return { scanned: accounts.length, notified };
}

// Guards against crying wolf: a single coffee on day 2 of the month is
// trivially "10x the average" when the average is built from almost nothing.
const SPIKE_MULTIPLE = 2;
const SPIKE_MIN_PRIOR_DAYS = 3;
const SPIKE_MIN_TODAY_KRW = 30_000;

/**
 * Flags a day whose spending is far above this month's daily average. Runs
 * once a day, so it needs no stored state — the schedule is the dedupe.
 */
export async function runSpendingSpike(now: Date = new Date()): Promise<CronRunResult> {
  if (!isTelegramConfigured()) return NOT_CONFIGURED;

  const accounts = await findLinkedAccounts();
  const today = appDate(now);
  const month = appMonth(now);
  const start = monthStart(month);
  let notified = 0;

  for (const account of accounts) {
    const preferences = await findCronPreferences(account.userId);
    if (isWithinQuietHours(preferences, now)) continue;

    const days = await sumExpenseByDayForRange(account.userId, start, nextDate(today));
    const todayTotal = days.find((day) => day.date === today)?.amountKrw ?? 0;
    if (todayTotal < SPIKE_MIN_TODAY_KRW) continue;

    const priorDays = days.filter((day) => day.date !== today);
    if (priorDays.length < SPIKE_MIN_PRIOR_DAYS) continue;

    const average = priorDays.reduce((sum, day) => sum + day.amountKrw, 0) / priorDays.length;
    if (average <= 0 || todayTotal < average * SPIKE_MULTIPLE) continue;

    const multiple = (todayTotal / average).toFixed(1);
    const message = [
      "⚡ <b>Unusual spending today</b>",
      "",
      `Today: ${krw.format(todayTotal)}`,
      `Daily average this month: ${krw.format(Math.round(average))}`,
      `That is ${multiple}× your usual day.`,
    ].join("\n");

    if (await sendTelegramMessage(account.chatId, message)) notified += 1;
  }

  return { scanned: accounts.length, notified };
}

/**
 * Nudges users who have not recorded any spending today. Users who already
 * logged something are skipped, so the reminder never arrives for a day the
 * user has already handled.
 */
export async function runDailyReminder(now: Date = new Date()): Promise<CronRunResult> {
  if (!isTelegramConfigured()) return NOT_CONFIGURED;

  const accounts = await findLinkedAccounts();
  const today = appDate(now);
  let notified = 0;

  for (const account of accounts) {
    const preferences = await findCronPreferences(account.userId);
    if (isWithinQuietHours(preferences, now)) continue;

    const days = await sumExpenseByDayForRange(account.userId, today, nextDate(today));
    if (days.length > 0) continue;

    const message = [
      "👋 <b>Anything to log today?</b>",
      "",
      "No spending recorded yet. Add it while you still remember what it was for.",
    ].join("\n");

    if (await sendTelegramMessage(account.chatId, message)) notified += 1;
  }

  return { scanned: accounts.length, notified };
}

function entryCount(count: number): string {
  return `${count} ${count === 1 ? "entry" : "entries"}`;
}

// Tied to the query rather than restated, so a new column can't drift.
type DayTotals = Awaited<ReturnType<typeof sumTotalsForRange>>;

/**
 * The check-in copy, shared by both channels so Telegram and the push
 * notification never drift apart.
 */
function dailyLogCopy(totals: DayTotals): { title: string; lines: string[] } {
  if (totals.count === 0) {
    return {
      title: "Log today's spending and income",
      lines: [
        "Nothing recorded yet today — no spending, no income.",
        "Add it while you still remember what it was for.",
      ],
    };
  }

  return {
    title: "Today's spending and income",
    lines: [
      `Spending: ${krw.format(totals.expenseKrw)} · ${entryCount(totals.expenseCount)}`,
      `Income: ${krw.format(totals.incomeKrw)} · ${entryCount(totals.incomeCount)}`,
      "Anything missing before the day closes?",
    ],
  };
}

/**
 * The 20:00 (Asia/Seoul) daily log check-in. Unlike runDailyReminder's midday
 * nudge this one always sends: on a day with nothing recorded it asks for the
 * day's spending and income, and on a day that already has entries it plays the
 * totals back so a forgotten income line is obvious before the day closes.
 *
 * Delivered on every channel the user has connected — Telegram, browser push,
 * or both — because Telegram is unreachable from some networks and the PWA
 * notification is the only channel that always lands on the phone.
 */
export async function runDailyLogReminder(now: Date = new Date()): Promise<CronRunResult> {
  const telegramAccounts = isTelegramConfigured() ? await findLinkedAccounts() : [];
  const pushUserIds = new Set(isPushNotificationConfigured() ? await listUsersWithPushSubscriptions() : []);

  const chatIdByUser = new Map(telegramAccounts.map((account) => [account.userId, account.chatId]));
  const userIds = [...new Set([...chatIdByUser.keys(), ...pushUserIds])];
  if (userIds.length === 0) {
    return { scanned: 0, notified: 0, skipped: "no_reminder_channel_connected" };
  }

  const today = appDate(now);
  const tomorrow = nextDate(today);
  let telegram = 0;
  let push = 0;

  for (const userId of userIds) {
    const preferences = await findCronPreferences(userId);
    if (isWithinQuietHours(preferences, now)) continue;

    const totals = await sumTotalsForRange(userId, today, tomorrow);
    const { title, lines } = dailyLogCopy(totals);

    // The two channels are independent deliveries; nothing is gained by making
    // one wait for the other.
    const chatId = chatIdByUser.get(userId);
    const [telegramSent, pushResult] = await Promise.all([
      chatId
        ? sendTelegramMessage(chatId, [`🧾 <b>${title}</b>`, "", ...lines].join("\n"))
        : Promise.resolve(false),
      pushUserIds.has(userId)
        ? listPushSubscriptionsForUser(userId).then((subscriptions) =>
            sendPushToSubscriptions(
              subscriptions,
              {
                title,
                body: lines.join(" "),
                // One notification per day: a re-run replaces it instead of stacking.
                tag: `daily-log-${today}`,
                data: { url: "/finance/transactions" },
              },
              { reminder: "daily_log", userId }
            )
          )
        : Promise.resolve(null),
    ]);

    if (telegramSent) telegram += 1;
    push += pushResult?.sent ?? 0;
  }

  return { scanned: userIds.length, notified: telegram + push, channels: { telegram, push } };
}
