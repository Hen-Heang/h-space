import "server-only";
import { findAccountByUserId } from "@/lib/repositories/telegram-account-repository";
import { getMonthlyReport, getWeeklySummary } from "@/lib/services/finance-report-service";
import { escapeTelegramHtml, isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram/client";
import { krw } from "@/lib/finance-format";
import type { MonthlyReport, WeeklySummary } from "@/types/finance";

export type TelegramSendResult = { sent: true } | { sent: false; reason: "not_configured" | "not_linked" | "send_failed" };

function formatWeeklyMessage(summary: WeeklySummary): string {
  const lines = [
    "📊 <b>Weekly summary</b>",
    "",
    `📈 Income: ${krw.format(summary.incomeKrw)}`,
    `📉 Expenses: ${krw.format(summary.expenseKrw)}`,
    `💰 Net: ${krw.format(summary.netCashFlowKrw)}`,
  ];

  if (summary.expenseChangePct !== null) {
    const arrow = summary.expenseChangePct > 0 ? "↑" : summary.expenseChangePct < 0 ? "↓" : "=";
    lines.push(`${arrow} ${Math.abs(summary.expenseChangePct)}% vs last week`);
  }

  if (summary.topCategories.length > 0) {
    lines.push("", "<b>Top categories</b>");
    for (const category of summary.topCategories) {
      lines.push(`• ${escapeTelegramHtml(category.categoryName)}: ${krw.format(category.amountKrw)}`);
    }
  }

  if (summary.budgetWarnings.length > 0) {
    lines.push("", "<b>Budget warnings</b>");
    for (const budget of summary.budgetWarnings) {
      lines.push(`⚠️ ${escapeTelegramHtml(budget.categoryName)}: ${budget.usagePct}%`);
    }
  }

  if (summary.subscriptionsMonthlyKrw > 0) {
    lines.push("", `Subscriptions: ${krw.format(summary.subscriptionsMonthlyKrw)}/mo`);
  }

  return lines.join("\n");
}

function formatMonthlyMessage(report: MonthlyReport, monthLabel: string): string {
  const lines = [
    `📅 <b>${escapeTelegramHtml(monthLabel)} report</b>`,
    "",
    `📈 Income: ${krw.format(report.totals.totalIncomeKrw)}`,
    `📉 Expenses: ${krw.format(report.totals.totalExpenseKrw)}`,
    `💰 Net: ${krw.format(report.totals.netCashFlowKrw)} (${report.totals.savingsRatePct}% savings rate)`,
  ];

  if (report.topCategories.length > 0) {
    lines.push("", "<b>Top categories</b>");
    for (const category of report.topCategories) {
      lines.push(`• ${escapeTelegramHtml(category.categoryName)}: ${krw.format(category.amountKrw)}`);
    }
  }

  const budgeted = report.budgetPerformance.filter((b) => b.budgetKrw > 0);
  if (budgeted.length > 0) {
    lines.push("", "<b>Budget performance</b>");
    for (const budget of budgeted.slice(0, 5)) {
      const marker = budget.status === "exceeded" ? "⚠️" : budget.status === "near_limit" ? "🟡" : budget.status === "watch" ? "🟠" : "🟢";
      lines.push(`${marker} ${escapeTelegramHtml(budget.categoryName)}: ${budget.usagePct}%`);
    }
  }

  if (report.observations.length > 0) {
    lines.push("", "<b>Notable</b>");
    for (const observation of report.observations) {
      lines.push(`• ${escapeTelegramHtml(observation.text)}`);
    }
  }

  return lines.join("\n");
}

export async function sendWeeklySummaryToTelegram(userId: string): Promise<TelegramSendResult> {
  if (!isTelegramConfigured()) return { sent: false, reason: "not_configured" };

  const account = await findAccountByUserId(userId);
  if (!account?.chatId) return { sent: false, reason: "not_linked" };

  const summary = await getWeeklySummary(userId);
  const ok = await sendTelegramMessage(account.chatId, formatWeeklyMessage(summary));
  return ok ? { sent: true } : { sent: false, reason: "send_failed" };
}

export async function sendMonthlyReportToTelegram(userId: string, month: string, monthLabel: string): Promise<TelegramSendResult> {
  if (!isTelegramConfigured()) return { sent: false, reason: "not_configured" };

  const account = await findAccountByUserId(userId);
  if (!account?.chatId) return { sent: false, reason: "not_linked" };

  const report = await getMonthlyReport(userId, month);
  const ok = await sendTelegramMessage(account.chatId, formatMonthlyMessage(report, monthLabel));
  return ok ? { sent: true } : { sent: false, reason: "send_failed" };
}
