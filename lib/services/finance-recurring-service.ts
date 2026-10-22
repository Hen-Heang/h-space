import "server-only";
import { Errors } from "@/lib/errors";
import { appDate } from "@/lib/finance-cron-time";
import { krw, usd } from "@/lib/finance-format";
import { dueOccurrences } from "@/lib/finance/recurring-schedule";
import { findCronPreferences } from "@/lib/repositories/finance-preferences-repository";
import {
  applyOccurrences,
  createRule as createRuleRepo,
  deleteRule as deleteRuleRepo,
  findDueRules,
  findRuleById,
  findRulesByUser,
  updateRule as updateRuleRepo,
  type OccurrenceAmounts,
  type RecurringRuleWrite,
} from "@/lib/repositories/finance-recurring-repository";
import { findRateOnOrBefore } from "@/lib/repositories/finance-exchange-rate-repository";
import { findAccountByUserId } from "@/lib/repositories/telegram-account-repository";
import { isWithinQuietHours } from "@/lib/services/finance-alert-service";
import { getUsdToKrwRate } from "@/lib/services/finance-exchange-rate-service";
import type { CronRunResult } from "@/lib/server/cron";
import { escapeTelegramHtml, isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram/client";
import type { RecurringRuleInput } from "@/lib/validation/finance";
import type { RecurringRule } from "@/types/finance";

// A start date further back than this would backfill a long run of entries
// in one go; older history belongs in Transactions, entered by hand.
const MAX_BACKFILL_DAYS = 92;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

async function toWrite(input: RecurringRuleInput, today: string): Promise<RecurringRuleWrite> {
  if (daysBetween(input.nextDate, today) > MAX_BACKFILL_DAYS) {
    throw Errors.validation(`The next date can be at most ${MAX_BACKFILL_DAYS} days in the past.`);
  }

  // A USD rule is converted at each occurrence's own rate when applied; the
  // KRW figure stored on the rule is only today's estimate, for display.
  let amountKrw = input.amountKrw as number;
  let exchangeRate: number | null = null;
  if (input.currency === "USD") {
    exchangeRate = (await getUsdToKrwRate()).rate;
    amountKrw = Math.round((input.originalAmount as number) * exchangeRate);
  }

  return {
    type: input.type,
    description: input.description,
    currency: input.currency,
    amountKrw,
    originalAmount: input.currency === "USD" ? (input.originalAmount as number) : null,
    exchangeRate,
    categoryId: input.categoryId ?? null,
    paymentMethodId: input.paymentMethodId ?? null,
    note: input.note || null,
    frequency: input.frequency,
    anchorDay: Number(input.nextDate.slice(8, 10)),
    nextDate: input.nextDate,
    isActive: input.isActive,
  };
}

/**
 * USD→KRW rate for an occurrence date, looked up at most once per date per
 * run and only if a USD rule is due. Today uses the live/cached rate; a
 * caught-up past date uses the last rate Luyra recorded on or before that
 * day, falling back to today's when none was recorded that far back.
 */
function rateLoader(today: string): (date: string) => Promise<number> {
  const rates = new Map<string, Promise<number>>();
  const current = () => getUsdToKrwRate().then((result) => result.rate);
  return (date) => {
    let rate = rates.get(date);
    if (!rate) {
      rate =
        date >= today
          ? current()
          : findRateOnOrBefore("USD", "KRW", date).then((stored) => (stored ? stored.rate : current()));
      rates.set(date, rate);
    }
    return rate;
  };
}

async function amountsFor(
  rule: RecurringRule,
  date: string,
  usdRate: (date: string) => Promise<number>
): Promise<OccurrenceAmounts> {
  if (rule.currency !== "USD" || rule.originalAmount === null) {
    return { amountKrw: rule.amountKrw, originalAmount: null, exchangeRate: null };
  }
  const rate = await usdRate(date);
  return { amountKrw: Math.round(rule.originalAmount * rate), originalAmount: rule.originalAmount, exchangeRate: rate };
}

interface AppliedEntry {
  rule: RecurringRule;
  dates: string[];
  /** KRW across every inserted occurrence — USD dates may each convert differently. */
  totalKrw: number;
}

async function applyDue(today: string, userId?: string): Promise<{ scanned: number; applied: Map<string, AppliedEntry[]> }> {
  const due = await findDueRules(today, userId);
  const usdRate = rateLoader(today);
  const applied = new Map<string, AppliedEntry[]>();

  for (const rule of due) {
    const { dates, nextDate } = dueOccurrences(rule.nextDate, rule.frequency, rule.anchorDay, today);
    try {
      const occurrences = await Promise.all(
        dates.map(async (date) => ({ date, amounts: await amountsFor(rule, date, usdRate) }))
      );
      const inserted = new Set(await applyOccurrences(rule, occurrences, nextDate));
      if (inserted.size === 0) continue;
      const totalKrw = occurrences
        .filter((occurrence) => inserted.has(occurrence.date))
        .reduce((sum, occurrence) => sum + occurrence.amounts.amountKrw, 0);
      const list = applied.get(rule.userId) ?? [];
      list.push({ rule, dates: [...inserted], totalKrw });
      applied.set(rule.userId, list);
    } catch (error) {
      // One bad rule must not stop everyone else's from applying.
      console.error(`[finance] recurring rule ${rule.id} failed to apply`, error);
    }
  }

  return { scanned: due.length, applied };
}

export async function listRecurringRules(userId: string): Promise<RecurringRule[]> {
  return findRulesByUser(userId);
}

/**
 * Saving a rule whose next date is today or earlier applies it immediately,
 * so "rent, starting today" shows up in Transactions now rather than after
 * the next scheduled run. Returns how many transactions that created.
 */
export async function createRecurringRule(
  userId: string,
  input: RecurringRuleInput
): Promise<{ rule: RecurringRule; appliedCount: number }> {
  const today = appDate();
  const created = await createRuleRepo(userId, await toWrite(input, today));
  const { applied } = await applyDue(today, userId);
  const appliedCount = (applied.get(userId) ?? []).reduce((sum, entry) => sum + entry.dates.length, 0);
  return { rule: (await findRuleById(created.id, userId)) ?? created, appliedCount };
}

export async function updateRecurringRule(
  userId: string,
  id: string,
  input: RecurringRuleInput
): Promise<{ rule: RecurringRule; appliedCount: number }> {
  const today = appDate();
  const existing = await findRuleById(id, userId);
  if (!existing) throw Errors.notFound("Recurring rule");
  const write = await toWrite(input, today);
  // A rule for the 31st currently sitting on a clamped Feb 28 must keep its
  // anchor when only the amount or note is edited; a new date re-anchors it.
  if (input.nextDate === existing.nextDate) write.anchorDay = existing.anchorDay;
  const updated = await updateRuleRepo(id, userId, write);
  if (!updated) throw Errors.notFound("Recurring rule");
  const { applied } = await applyDue(today, userId);
  const appliedCount = (applied.get(userId) ?? []).reduce((sum, entry) => sum + entry.dates.length, 0);
  return { rule: (await findRuleById(id, userId)) ?? updated, appliedCount };
}

export async function deleteRecurringRule(userId: string, id: string): Promise<void> {
  const deleted = await deleteRuleRepo(id, userId);
  if (!deleted) throw Errors.notFound("Recurring rule");
}

function summaryMessage(entries: AppliedEntry[]): string {
  // "×3" entries show the combined KRW, since caught-up USD dates can each
  // have converted at a different rate.
  const lines = entries.map(({ rule, dates, totalKrw }) => {
    const sign = rule.type === "income" ? "+" : "−";
    const times = dates.length > 1 ? ` ×${dates.length}` : "";
    const amount =
      rule.currency === "USD" && rule.originalAmount !== null
        ? `${usd.format(rule.originalAmount)}${times} (${krw.format(totalKrw)})`
        : `${krw.format(rule.amountKrw)}${times}${dates.length > 1 ? ` (${krw.format(totalKrw)})` : ""}`;
    return `• ${escapeTelegramHtml(rule.description)} ${sign}${amount}`;
  });
  const total = entries.reduce((sum, entry) => sum + entry.dates.length, 0);
  return [`🔁 <b>Recurring added</b> (${total})`, "", ...lines].join("\n");
}

/**
 * Daily cron: creates every due occurrence for every user, then sends one
 * Telegram summary per user who got something. The transactions are written
 * regardless of Telegram; quiet hours only hold back the message.
 */
export async function runRecurring(now: Date = new Date()): Promise<CronRunResult & { applied: number }> {
  const { scanned, applied } = await applyDue(appDate(now));
  const appliedCount = Array.from(applied.values())
    .flat()
    .reduce((sum, entry) => sum + entry.dates.length, 0);

  let notified = 0;
  if (isTelegramConfigured()) {
    for (const [userId, entries] of applied) {
      const account = await findAccountByUserId(userId);
      if (!account?.chatId) continue;
      if (isWithinQuietHours(await findCronPreferences(userId), now)) continue;
      if (await sendTelegramMessage(account.chatId, summaryMessage(entries))) notified += 1;
    }
  }

  return { scanned, notified, applied: appliedCount };
}
