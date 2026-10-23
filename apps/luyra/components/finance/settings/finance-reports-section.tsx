"use client";

import { useEffect, useState } from "react";
import { Mail, Printer, Send } from "lucide-react";
import { FinanceErrorState, MonthSelector } from "@/components/finance/ui/finance-primitives";
import { WeeklySummaryCard } from "@/components/finance/settings/weekly-summary-card";
import { MonthlyReportCard } from "@/components/finance/settings/monthly-report-card";
import {
  getEmailStatus,
  getMonthlyReport,
  getWeeklySummary,
  sendMonthlyReportEmail,
  sendMonthlyReportTelegram,
  sendWeeklySummaryEmail,
  sendWeeklySummaryTelegram,
} from "@/lib/api/finance";
import { getTelegramLinkStatus } from "@/lib/api/telegram";
import { monthKey, monthLabel } from "@/lib/finance-month";
import { cn } from "@/lib/utils";
import type { MonthlyReport, WeeklySummary } from "@/types/finance";

type ReportTab = "weekly" | "monthly";

function ReportsLoading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading report">
      {[0, 1, 2].map((row) => (
        <div key={row} className="h-24 rounded-2xl bg-secondary motion-safe:animate-pulse" />
      ))}
    </div>
  );
}

export function FinanceReportsSection() {
  const [tab, setTab] = useState<ReportTab>("weekly");
  const [monthOffset, setMonthOffset] = useState(-1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [weekly, setWeekly] = useState<{ key: number; data: WeeklySummary | null; error: string | null }>({
    key: -1,
    data: null,
    error: null,
  });
  const [monthly, setMonthly] = useState<{ key: string; data: MonthlyReport | null; error: string | null }>({
    key: "",
    data: null,
    error: null,
  });

  useEffect(() => {
    if (tab !== "weekly" || weekly.key === refreshKey) return;
    void getWeeklySummary()
      .then((data) => setWeekly({ key: refreshKey, data, error: null }))
      .catch(() => setWeekly({ key: refreshKey, data: null, error: "We couldn't load the weekly summary. Try again in a moment." }));
  }, [tab, refreshKey, weekly.key]);

  const monthlyRequestKey = `${monthOffset}:${refreshKey}`;
  useEffect(() => {
    if (tab !== "monthly" || monthly.key === monthlyRequestKey) return;
    void getMonthlyReport(monthKey(monthOffset))
      .then((data) => setMonthly({ key: monthlyRequestKey, data, error: null }))
      .catch(() => setMonthly({ key: monthlyRequestKey, data: null, error: "We couldn't load the monthly report. Try again in a moment." }));
  }, [tab, monthOffset, monthlyRequestKey, monthly.key]);

  const [telegramLinked, setTelegramLinked] = useState(false);
  const [sendingToTelegram, setSendingToTelegram] = useState(false);
  const [telegramMessage, setTelegramMessage] = useState<string | null>(null);

  useEffect(() => {
    getTelegramLinkStatus()
      .then((status) => setTelegramLinked(status.linked))
      .catch(() => setTelegramLinked(false));
  }, [refreshKey]);

  const [emailConfigured, setEmailConfigured] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  useEffect(() => {
    getEmailStatus()
      .then((status) => setEmailConfigured(status.configured))
      .catch(() => setEmailConfigured(false));
  }, [refreshKey]);

  function refresh() {
    setRefreshKey((key) => key + 1);
  }

  async function handleSendToTelegram() {
    setSendingToTelegram(true);
    setTelegramMessage(null);
    try {
      const result =
        tab === "weekly" ? await sendWeeklySummaryTelegram() : await sendMonthlyReportTelegram(monthKey(monthOffset), monthLabel(monthOffset));
      setTelegramMessage(
        result.sent
          ? "Sent to Telegram."
          : result.reason === "not_linked"
            ? "Not linked — link Telegram above first."
            : result.reason === "not_configured"
              ? "Telegram isn't configured."
              : "Couldn't send. Try again."
      );
    } catch {
      setTelegramMessage("Couldn't send. Try again.");
    } finally {
      setSendingToTelegram(false);
    }
  }

  async function handleSendEmail() {
    setSendingEmail(true);
    setEmailMessage(null);
    try {
      const result = tab === "weekly" ? await sendWeeklySummaryEmail() : await sendMonthlyReportEmail(monthKey(monthOffset), monthLabel(monthOffset));
      setEmailMessage(
        result.sent
          ? "Sent by email."
          : result.reason === "not_configured"
            ? "Email isn't configured."
            : result.reason === "no_recipient"
              ? "No email address on file."
              : "Couldn't send. Try again."
      );
    } catch {
      setEmailMessage("Couldn't send. Try again.");
    } finally {
      setSendingEmail(false);
    }
  }

  const printHref = tab === "weekly" ? "/reports-print?type=weekly" : `/reports-print?type=monthly&month=${monthKey(monthOffset)}`;
  const reportReady = tab === "weekly" ? Boolean(weekly.data) : Boolean(monthly.data);

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="grid w-full grid-cols-2 gap-1 rounded-xl border bg-secondary p-1 sm:flex sm:w-auto">
          {([
            { value: "weekly", label: "Weekly summary" },
            { value: "monthly", label: "Monthly report" },
          ] as const).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTab(option.value)}
              className={cn(
                "min-h-11 min-w-0 rounded-lg px-2 text-xs font-medium transition-colors sm:min-h-9 sm:px-3 sm:text-sm",
                tab === option.value ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {tab === "monthly" && (
            <MonthSelector
              label={monthLabel(monthOffset)}
              onPrevious={() => setMonthOffset((offset) => offset - 1)}
              onNext={() => setMonthOffset((offset) => offset + 1)}
              nextDisabled={monthOffset >= 0}
              ariaLabel="Monthly report month selector"
              size="sm"
            />
          )}
          {reportReady && (
            <a
              href={printHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-secondary sm:min-h-9"
            >
              <Printer className="size-4" aria-hidden="true" />
              Print
            </a>
          )}
          {reportReady && telegramLinked && (
            <button
              type="button"
              onClick={handleSendToTelegram}
              disabled={sendingToTelegram}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-secondary disabled:opacity-50 sm:min-h-9"
            >
              <Send className="size-4" aria-hidden="true" />
              {sendingToTelegram ? "Sending…" : "Send to Telegram"}
            </button>
          )}
          {reportReady && emailConfigured && (
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-secondary disabled:opacity-50 sm:min-h-9"
            >
              <Mail className="size-4" aria-hidden="true" />
              {sendingEmail ? "Sending…" : "Send email"}
            </button>
          )}
        </div>
      </div>

      {telegramMessage && <p className="text-xs text-muted-foreground">{telegramMessage}</p>}
      {emailMessage && <p className="text-xs text-muted-foreground">{emailMessage}</p>}

      {tab === "weekly" ? (
        weekly.error ? (
          <FinanceErrorState title="Weekly summary unavailable" description={weekly.error} onRetry={refresh} />
        ) : weekly.key !== refreshKey || !weekly.data ? (
          <ReportsLoading />
        ) : (
          <WeeklySummaryCard summary={weekly.data} />
        )
      ) : monthly.error ? (
        <FinanceErrorState title="Monthly report unavailable" description={monthly.error} onRetry={refresh} />
      ) : monthly.key !== monthlyRequestKey || !monthly.data ? (
        <ReportsLoading />
      ) : (
        <MonthlyReportCard report={monthly.data} monthLabel={monthLabel(monthOffset)} />
      )}
    </div>
  );
}
