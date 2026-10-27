import "server-only";
import { getPreferences } from "@/lib/services/finance-preferences-service";
import { getMonthlyReport, getWeeklySummary } from "@/lib/services/finance-report-service";
import { escapeHtml, isEmailConfigured, sendEmail } from "@/lib/email/client";
import { krw } from "@/lib/finance-format";
import type { MonthlyReport, WeeklySummary } from "@/types/finance";

export type EmailSendResult = { sent: true } | { sent: false; reason: "not_configured" | "no_recipient" | "send_failed" };

function wrapEmail(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#18181b;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:24px;">
      <h1 style="margin:0 0 16px;font-size:18px;">${escapeHtml(title)}</h1>
      ${bodyHtml}
      <p style="margin:24px 0 0;font-size:12px;color:#71717a;">Sent by Luyra.</p>
    </div>
  </body>
</html>`;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:4px 0;color:#52525b;font-size:14px;">${escapeHtml(label)}</td><td style="padding:4px 0;text-align:right;font-size:14px;font-weight:600;">${value}</td></tr>`;
}

function section(heading: string, rows: string[]): string {
  if (rows.length === 0) return "";
  return `<h2 style="margin:20px 0 8px;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(heading)}</h2><table style="width:100%;border-collapse:collapse;">${rows.join("")}</table>`;
}

function formatWeeklyEmail(summary: WeeklySummary): string {
  const totals = [
    row("Income", krw.format(summary.incomeKrw)),
    row("Expenses", krw.format(summary.expenseKrw)),
    row("Net", krw.format(summary.netCashFlowKrw)),
  ];
  if (summary.expenseChangePct !== null) {
    const arrow = summary.expenseChangePct > 0 ? "up" : summary.expenseChangePct < 0 ? "down" : "flat";
    totals.push(row("vs last week", `${arrow} ${Math.abs(summary.expenseChangePct)}%`));
  }

  const categories = summary.topCategories.map((c) => row(c.categoryName, krw.format(c.amountKrw)));
  const warnings = summary.budgetWarnings.map((b) => row(b.categoryName, `${b.usagePct}%`));

  return wrapEmail(
    "Weekly summary",
    [section("Totals", totals), section("Top categories", categories), section("Budget warnings", warnings)].join("")
  );
}

function formatMonthlyEmail(report: MonthlyReport, monthLabel: string): string {
  const totals = [
    row("Income", krw.format(report.totals.totalIncomeKrw)),
    row("Expenses", krw.format(report.totals.totalExpenseKrw)),
    row("Net", `${krw.format(report.totals.netCashFlowKrw)} (${report.totals.savingsRatePct}% savings rate)`),
  ];

  const categories = report.topCategories.map((c) => row(c.categoryName, krw.format(c.amountKrw)));
  const budgeted = report.budgetPerformance.filter((b) => b.budgetKrw > 0).slice(0, 5).map((b) => row(b.categoryName, `${b.usagePct}% (${b.status.replace("_", " ")})`));
  const observations = report.observations.map((o) => `<p style="margin:4px 0;font-size:14px;">• ${escapeHtml(o.text)}</p>`).join("");

  return wrapEmail(
    `${monthLabel} report`,
    [section("Totals", totals), section("Top categories", categories), section("Budget performance", budgeted), observations].join("")
  );
}

async function resolveRecipient(userId: string, accountEmail: string): Promise<string | null> {
  const preferences = await getPreferences(userId);
  return preferences.financeReportEmail || accountEmail || null;
}

export async function sendWeeklySummaryEmail(userId: string, accountEmail: string): Promise<EmailSendResult> {
  if (!isEmailConfigured()) return { sent: false, reason: "not_configured" };

  const to = await resolveRecipient(userId, accountEmail);
  if (!to) return { sent: false, reason: "no_recipient" };

  const summary = await getWeeklySummary(userId);
  const result = await sendEmail({ to, subject: "Weekly summary — Luyra", html: formatWeeklyEmail(summary) });
  return result.ok ? { sent: true } : { sent: false, reason: "send_failed" };
}

export async function sendMonthlyReportEmail(userId: string, accountEmail: string, month: string, monthLabel: string): Promise<EmailSendResult> {
  if (!isEmailConfigured()) return { sent: false, reason: "not_configured" };

  const to = await resolveRecipient(userId, accountEmail);
  if (!to) return { sent: false, reason: "no_recipient" };

  const report = await getMonthlyReport(userId, month);
  const result = await sendEmail({ to, subject: `${monthLabel} report — Luyra`, html: formatMonthlyEmail(report, monthLabel) });
  return result.ok ? { sent: true } : { sent: false, reason: "send_failed" };
}
