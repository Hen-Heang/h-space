"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileDown, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FinanceErrorState, FinanceSection } from "@/components/finance/ui/finance-primitives";
import { CategoriesSection } from "@/components/finance/settings/categories-section";
import { PaymentMethodsSection } from "@/components/finance/settings/payment-methods-section";
import { FinanceReportsSection } from "@/components/finance/settings/finance-reports-section";
import { TelegramLinkSection } from "@/components/finance/settings/telegram-link-section";
import { MoneyCoachSection } from "@/components/finance/settings/money-coach-section";
import { cn } from "@/lib/utils";
import { updatePreferences } from "@/lib/api/finance";
import { financeKeys, preferencesQuery } from "@/lib/query/finance-queries";
import { toMoneyRule } from "@/lib/finance/financial-health";

// Preset money rules from AGENTS.md's Financial Health spec. Lifestyle is
// never one of these numbers directly — it's always 100 - essential - future
// (see toMoneyRule) — so a preset only needs to name the two stored values.
const MONEY_RULE_PRESETS = [
  { label: "Balanced", essentialTargetPct: 50, targetSavingsRate: 20 },
  { label: "Growth", essentialTargetPct: 50, targetSavingsRate: 25 },
  { label: "Future Focus", essentialTargetPct: 45, targetSavingsRate: 35 },
] as const;

function SettingsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading Finance settings">
      {[0, 1, 2].map((section) => (
        <div key={section} className="h-32 rounded-2xl bg-secondary motion-safe:animate-pulse" />
      ))}
    </div>
  );
}

export function FinanceSettingsForm() {
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [targetRate, setTargetRate] = useState("20");
  const [essentialTargetPct, setEssentialTargetPct] = useState("50");
  const [watchThreshold, setWatchThreshold] = useState("70");
  const [nearLimitThreshold, setNearLimitThreshold] = useState("90");
  const [monthlyReviewEnabled, setMonthlyReviewEnabled] = useState(true);
  const [financeReportEmail, setFinanceReportEmail] = useState("");
  const [weeklyReportEmailEnabled, setWeeklyReportEmailEnabled] = useState(false);
  const [monthlyReportEmailEnabled, setMonthlyReportEmailEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // Bumped by "Try again" so the load effect actually runs again.
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // The form keeps its own editable copy, seeded from the shared preferences
  // cache (fetchQuery reuses fresh cached data, e.g. from the Review page).
  useEffect(() => {
    let active = true;
    queryClient
      .fetchQuery(preferencesQuery)
      .then((preferences) => {
        if (!active) return;
        setMonthlyLimit(preferences.monthlySpendingLimitKrw != null ? String(preferences.monthlySpendingLimitKrw) : "");
        setTargetRate(String(preferences.targetSavingsRate));
        setEssentialTargetPct(String(preferences.essentialTargetPct));
        setWatchThreshold(String(preferences.budgetWatchThresholdPct));
        setNearLimitThreshold(String(preferences.budgetNearLimitThresholdPct));
        setMonthlyReviewEnabled(preferences.monthlyReviewEnabled);
        setFinanceReportEmail(preferences.financeReportEmail ?? "");
        setWeeklyReportEmailEnabled(preferences.weeklyReportEmailEnabled);
        setMonthlyReportEmailEnabled(preferences.monthlyReportEmailEnabled);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [queryClient, loadAttempt]);

  // The browser's native #hash scroll fires on initial navigation, before
  // this client component has replaced SettingsLoading's skeleton with the
  // real form — so a deep link like /finance/settings#settings-categories
  // (used by the Financial Health "Unclassified spending" banner) lands on
  // a target that doesn't exist in the DOM yet and silently does nothing.
  // Re-attempting the scroll once loading finishes covers the fix without
  // touching how the settings page looks.
  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash;
    if (!hash) return;
    document.querySelector(hash)?.scrollIntoView({ block: "start" });
  }, [loading]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const watchPct = Number(watchThreshold);
    const nearLimitPct = Number(nearLimitThreshold);
    if (!Number.isFinite(watchPct) || !Number.isFinite(nearLimitPct) || watchPct < 1 || watchPct > 99 || nearLimitPct < 1 || nearLimitPct > 99) {
      setError("Budget thresholds must be between 1 and 99.");
      return;
    }
    if (watchPct >= nearLimitPct) {
      setError("The watch threshold must be lower than the near-limit threshold.");
      return;
    }
    const essentialPct = Number(essentialTargetPct);
    const futurePct = Number(targetRate);
    if (!Number.isFinite(essentialPct) || essentialPct < 0 || essentialPct > 100 || !Number.isFinite(futurePct) || futurePct < 0 || futurePct > 100) {
      setError("Money rule percentages must be between 0 and 100.");
      return;
    }
    if (essentialPct + futurePct > 100) {
      setError("Essentials and Future targets can't add up to more than 100%.");
      return;
    }
    const trimmedEmail = financeReportEmail.trim();
    if (trimmedEmail !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Enter a valid email address, or leave it blank to use your account email.");
      return;
    }

    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updatePreferences({
        monthlySpendingLimitKrw: monthlyLimit.trim() === "" ? null : Number(monthlyLimit),
        targetSavingsRate: futurePct,
        essentialTargetPct: essentialPct,
        budgetWatchThresholdPct: watchPct,
        budgetNearLimitThresholdPct: nearLimitPct,
        monthlyReviewEnabled,
        financeReportEmail: trimmedEmail === "" ? null : trimmedEmail,
        weeklyReportEmailEnabled,
        monthlyReportEmailEnabled,
      });
      // So the Review page's on/off check sees the change without a refetch.
      queryClient.setQueryData(financeKeys.preferences(), updated);
      setSaved(true);
    } catch {
      setError("Couldn't save your settings. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (loadError) {
    return (
      <FinanceErrorState
        title="Finance settings unavailable"
        description="We couldn't load your Finance settings. Try again in a moment."
        onRetry={() => {
          setLoadError(false);
          setLoading(true);
          setLoadAttempt((attempt) => attempt + 1);
        }}
      />
    );
  }

  if (loading) return <SettingsLoading />;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <FinanceSection id="settings-goals" title="Financial goals" description="Used for the daily spending guide and savings-rate framing across Finance.">
          <div className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="monthly-limit">Monthly spending limit (KRW)</Label>
              <Input
                id="monthly-limit"
                type="number"
                min="0"
                step="1000"
                placeholder="No limit"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target-savings-rate">Target savings rate (%)</Label>
              <Input
                id="target-savings-rate"
                type="number"
                min="0"
                max="100"
                value={targetRate}
                onChange={(e) => setTargetRate(e.target.value)}
              />
            </div>
          </div>
        </FinanceSection>

        <FinanceSection
          id="settings-money-rule"
          title="Money rule"
          description="The Essentials / Lifestyle / Future guideline shown on your Finance overview. Essentials and Lifestyle are maximums; Future is a minimum — Lifestyle is always the remainder of the other two."
        >
          <div className="space-y-4 rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap gap-2">
              {MONEY_RULE_PRESETS.map((preset) => {
                const active = Number(essentialTargetPct) === preset.essentialTargetPct && Number(targetRate) === preset.targetSavingsRate;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setEssentialTargetPct(String(preset.essentialTargetPct));
                      setTargetRate(String(preset.targetSavingsRate));
                    }}
                    className={cn(
                      "min-h-11 rounded-full border px-4 py-2 text-xs font-bold transition-all active:scale-95",
                      active
                        ? "border-primary/40 bg-primary text-primary-foreground shadow-md"
                        : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {preset.label} · {preset.essentialTargetPct}/{100 - preset.essentialTargetPct - preset.targetSavingsRate}/{preset.targetSavingsRate}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="essential-target-pct">Essentials max (%)</Label>
                <Input
                  id="essential-target-pct"
                  type="number"
                  min="0"
                  max="100"
                  value={essentialTargetPct}
                  onChange={(e) => setEssentialTargetPct(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Lifestyle max (%)</Label>
                <div className="flex min-h-9 items-center rounded-md border bg-secondary px-3 text-sm text-muted-foreground">
                  {toMoneyRule(Number(essentialTargetPct) || 0, Number(targetRate) || 0).lifestylePct}% · derived from the other two
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Future&rsquo;s minimum uses the target savings rate above.</p>
          </div>
        </FinanceSection>

        <FinanceSection id="settings-budget-controls" title="Budget controls" description="When a budgeted category moves from Healthy to Watch to Near limit. Exceeded always means 100% or more.">
          <div className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="watch-threshold">Watch threshold (%)</Label>
              <Input
                id="watch-threshold"
                type="number"
                min="1"
                max="99"
                value={watchThreshold}
                onChange={(e) => setWatchThreshold(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="near-limit-threshold">Near-limit threshold (%)</Label>
              <Input
                id="near-limit-threshold"
                type="number"
                min="1"
                max="99"
                value={nearLimitThreshold}
                onChange={(e) => setNearLimitThreshold(e.target.value)}
              />
            </div>
          </div>
        </FinanceSection>

        <FinanceSection id="settings-reviews" title="Reviews" description="Whether the Monthly Review screen is available.">
          <div className="flex flex-col items-stretch gap-3 rounded-2xl border bg-card p-4 xs:flex-row xs:items-center xs:justify-between xs:gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Monthly review</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Show the Monthly Review screen and its deterministic observations.</p>
            </div>
            <div className="flex shrink-0 self-end gap-1 rounded-xl border bg-secondary p-1">
              {[
                { label: "On", value: true },
                { label: "Off", value: false },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setMonthlyReviewEnabled(option.value)}
                  className={cn(
                    "min-h-11 rounded-lg px-3 text-sm font-medium transition-colors sm:min-h-9",
                    monthlyReviewEnabled === option.value ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </FinanceSection>

        <FinanceSection id="settings-email-reports" title="Email reports" description="Your delivery preference for the Weekly summary and Monthly report. Leave the address blank to use your account email. No scheduler is deployed yet, so use the “Send email” button in Reports below to deliver one now.">
          <div className="space-y-4 rounded-2xl border bg-card p-4">
            <div className="space-y-1.5">
              <Label htmlFor="finance-report-email">Report email (optional)</Label>
              <Input
                id="finance-report-email"
                type="email"
                placeholder="you@example.com"
                value={financeReportEmail}
                onChange={(e) => setFinanceReportEmail(e.target.value)}
              />
            </div>
            {(
              [
                { label: "Weekly summary email", value: weeklyReportEmailEnabled, onChange: setWeeklyReportEmailEnabled },
                { label: "Monthly report email", value: monthlyReportEmailEnabled, onChange: setMonthlyReportEmailEnabled },
              ] as const
            ).map((toggle) => (
              <div key={toggle.label} className="flex flex-col items-stretch gap-2 xs:flex-row xs:items-center xs:justify-between xs:gap-4">
                <p className="min-w-0 text-sm font-medium">{toggle.label}</p>
                <div className="flex shrink-0 self-end gap-1 rounded-xl border bg-secondary p-1">
                  {[
                    { label: "On", value: true },
                    { label: "Off", value: false },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => toggle.onChange(option.value)}
                      className={cn(
                        "min-h-11 rounded-lg px-3 text-sm font-medium transition-colors sm:min-h-9",
                        toggle.value === option.value ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </FinanceSection>

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {saved && !error && (
          <p className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Saved.
          </p>
        )}

        <Button type="submit" size="sm" disabled={pending} className="min-h-11 w-full xs:w-auto">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <FinanceSection id="settings-categories" title="Categories" description="How transactions are grouped, and what budgets are set against. A category still used by a transaction, budget, or template can't be deleted.">
        <CategoriesSection />
      </FinanceSection>

      <FinanceSection id="settings-payment-methods" title="Payment methods" description="How you paid — cards, cash, accounts. Used for the payment-method breakdown in Analytics.">
        <PaymentMethodsSection />
      </FinanceSection>

      <FinanceSection id="settings-telegram" title="Telegram" description="Link a Telegram chat to send reports there on demand. Luyra keeps your Telegram identity separate from your login.">
        <TelegramLinkSection />
      </FinanceSection>

      <FinanceSection id="settings-reports" title="Reports" description="Deterministic weekly and monthly digests. Print them or, once linked above, send them to Telegram.">
        <FinanceReportsSection />
      </FinanceSection>

      <FinanceSection id="settings-export" title="Export" description="Download your full transaction history, or open the current report as a printable page (use your browser's Print dialog to save as PDF).">
        <div className="flex flex-wrap gap-2 rounded-2xl border bg-card p-4">
          <a
            href="/api/finance/export?format=csv"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-secondary"
          >
            <FileDown className="size-4" aria-hidden="true" />
            Download CSV
          </a>
          <a
            href="/api/finance/export?format=json"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-secondary"
          >
            <FileDown className="size-4" aria-hidden="true" />
            Download JSON
          </a>
        </div>
      </FinanceSection>

      <FinanceSection id="settings-money-coach" title="AI Money Coach" description="Optional. Explains your Monthly Report and can suggest a budget change for you to review and apply — it never changes anything on its own.">
        <MoneyCoachSection />
      </FinanceSection>
    </div>
  );
}
