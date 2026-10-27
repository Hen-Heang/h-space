"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { WeeklySummaryCard } from "@/components/finance/settings/weekly-summary-card";
import { MonthlyReportCard } from "@/components/finance/settings/monthly-report-card";
import { getMonthlyReport, getWeeklySummary } from "@/lib/api/finance";
import type { MonthlyReport, WeeklySummary } from "@/types/finance";

function formatMonthLabel(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(year, monthIndex - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function ReportsPrintView() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") === "monthly" ? "monthly" : "weekly";
  const month = searchParams.get("month");

  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; weekly: WeeklySummary | null; monthly: MonthlyReport | null }>({
    status: "loading",
    weekly: null,
    monthly: null,
  });

  const missingMonth = type === "monthly" && !month;

  useEffect(() => {
    if (missingMonth) return;
    let active = true;
    if (type === "weekly") {
      getWeeklySummary()
        .then((data) => active && setState({ status: "ready", weekly: data, monthly: null }))
        .catch(() => active && setState({ status: "error", weekly: null, monthly: null }));
    } else if (month) {
      getMonthlyReport(month)
        .then((data) => active && setState({ status: "ready", weekly: null, monthly: data }))
        .catch(() => active && setState({ status: "error", weekly: null, monthly: null }));
    }
    return () => {
      active = false;
    };
  }, [type, month, missingMonth]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 print:px-0 print:py-4">
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <Link href="/finance/settings" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Finance Settings
        </Link>
        {state.status === "ready" && (
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-secondary"
          >
            <Printer className="size-4" aria-hidden="true" />
            Print / Save as PDF
          </button>
        )}
      </div>

      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Luyra</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{type === "weekly" ? "Weekly summary" : "Monthly report"}</h1>
      </div>

      {missingMonth || state.status === "error" ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          We couldn&apos;t load this report. Go back to Finance Settings and try again.
        </p>
      ) : state.status === "loading" ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          {state.weekly && <WeeklySummaryCard summary={state.weekly} />}
          {state.monthly && month && <MonthlyReportCard report={state.monthly} monthLabel={formatMonthLabel(month)} />}
        </>
      )}
    </div>
  );
}
