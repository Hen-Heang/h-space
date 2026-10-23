import "server-only";
import { findReportRecipients, markReportSent } from "@/lib/repositories/finance-preferences-repository";
import { sendMonthlyReportEmail, sendWeeklySummaryEmail } from "@/lib/services/finance-email-service";
import { sendMonthlyReportToTelegram, sendWeeklySummaryToTelegram } from "@/lib/services/finance-telegram-service";
import { appDate, appMonth, monthKeyLabel, previousMonth, weekStart } from "@/lib/finance-cron-time";
import { isEmailConfigured } from "@/lib/email/client";
import { isTelegramConfigured } from "@/lib/telegram/client";
import type { CronRunResult } from "@/lib/server/cron";

const NO_CHANNEL: CronRunResult = {
  scanned: 0,
  notified: 0,
  channels: { telegram: 0, email: 0 },
  skipped: "no_channel_configured",
};

/**
 * Weekly summary, delivered on every channel the user has enabled.
 *
 * Each channel is tracked independently against the Monday of the current
 * week, so Telegram succeeding while email fails leaves email to retry on the
 * next run rather than marking the whole week done. A marker is written only
 * after that specific channel confirms delivery.
 */
export async function runWeeklySummaries(now: Date = new Date()): Promise<CronRunResult> {
  const telegramReady = isTelegramConfigured();
  const emailReady = isEmailConfigured();
  if (!telegramReady && !emailReady) return NO_CHANNEL;

  const recipients = await findReportRecipients();
  const week = weekStart(appDate(now));
  let telegram = 0;
  let email = 0;

  for (const recipient of recipients) {
    if (!recipient.weeklyEnabled) continue;

    if (telegramReady && recipient.chatId && recipient.weeklyTelegramSentWeek !== week) {
      const result = await sendWeeklySummaryToTelegram(recipient.userId);
      if (result.sent) {
        await markReportSent(recipient.userId, "weekly", "telegram", week);
        telegram += 1;
      }
    }

    if (emailReady && recipient.weeklyEmailEnabled && recipient.weeklyEmailSentWeek !== week) {
      const result = await sendWeeklySummaryEmail(recipient.userId, recipient.accountEmail);
      if (result.sent) {
        await markReportSent(recipient.userId, "weekly", "email", week);
        email += 1;
      }
    }
  }

  return { scanned: recipients.length, notified: telegram + email, channels: { telegram, email } };
}

/**
 * Monthly report for the month that has just finished, on every enabled
 * channel.
 *
 * Runs daily rather than on the 1st: a run that fails or is skipped on the 1st
 * would otherwise lose the report for a whole month. The per-channel markers
 * are what keep a daily schedule from re-sending.
 */
export async function runMonthlyReports(now: Date = new Date()): Promise<CronRunResult> {
  const telegramReady = isTelegramConfigured();
  const emailReady = isEmailConfigured();
  if (!telegramReady && !emailReady) return NO_CHANNEL;

  const recipients = await findReportRecipients();
  const reportMonth = previousMonth(appMonth(now));
  const label = monthKeyLabel(reportMonth);
  let telegram = 0;
  let email = 0;

  for (const recipient of recipients) {
    if (!recipient.monthlyEnabled) continue;

    if (
      telegramReady &&
      recipient.chatId &&
      recipient.monthlyTelegramEnabled &&
      recipient.monthlyTelegramSentMonth !== reportMonth
    ) {
      const result = await sendMonthlyReportToTelegram(recipient.userId, reportMonth, label);
      if (result.sent) {
        await markReportSent(recipient.userId, "monthly", "telegram", reportMonth);
        telegram += 1;
      }
    }

    if (emailReady && recipient.monthlyEmailEnabled && recipient.monthlyEmailSentMonth !== reportMonth) {
      const result = await sendMonthlyReportEmail(recipient.userId, recipient.accountEmail, reportMonth, label);
      if (result.sent) {
        await markReportSent(recipient.userId, "monthly", "email", reportMonth);
        email += 1;
      }
    }
  }

  return { scanned: recipients.length, notified: telegram + email, channels: { telegram, email } };
}
