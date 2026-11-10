"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Check, CheckCircle2, FileDown, Loader2 } from "lucide-react"
import { Button } from "@/components/finance/base/button"
import { Input } from "@/components/finance/base/input"
import { Label } from "@/components/finance/base/label"
import { FinanceErrorState, FinanceSection } from "@/components/finance/ui/finance-primitives"
import { CategoriesSection } from "@/components/finance/settings/categories-section"
import { PaymentMethodsSection } from "@/components/finance/settings/payment-methods-section"
import { FinanceReportsSection } from "@/components/finance/settings/finance-reports-section"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { downloadFinanceExport, updatePreferences } from "@/lib/api/finance"
import { financeKeys, invalidateAfter, preferencesQuery } from "@/lib/query/finance-queries"
import { toMoneyRule } from "@/lib/finance/financial-health"
import {
  draftFromPreferences,
  GROUP_INPUT,
  isGroupDirty,
  mergeSavedGroup,
  type SettingsDraft,
  type SettingsGroup,
} from "@/lib/finance/settings-form"

// Preset money rules from AGENTS.md's Financial Health spec. Lifestyle is
// never one of these numbers directly — it's always 100 - essential - future
// (see toMoneyRule) — so a preset only needs to name the two stored values.
const MONEY_RULE_PRESETS = [
  { label: "Balanced", essentialTargetPct: 50, targetSavingsRate: 20 },
  { label: "Growth", essentialTargetPct: 50, targetSavingsRate: 25 },
  { label: "Future Focus", essentialTargetPct: 45, targetSavingsRate: 35 },
] as const

type GroupStatus = { pending: boolean; saved: boolean; error: string | null }
const IDLE: GroupStatus = { pending: false, saved: false, error: null }

function SettingsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading Finance settings">
      {[0, 1, 2].map((section) => (
        <div key={section} className="h-32 rounded-lg bg-secondary motion-safe:animate-pulse" />
      ))}
    </div>
  )
}

/**
 * Finance preferences in three groups, each saved on its own (the endpoint
 * accepts any subset of fields), followed by categories, payment methods,
 * reports and export. Section ids are deep-link targets — e.g. the Overview's
 * "Unclassified spending" row links to #settings-categories — so they stay.
 */
export function FinanceSettingsForm() {
  const [draft, setDraft] = useState<SettingsDraft | null>(null)
  const [savedDraft, setSavedDraft] = useState<SettingsDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  // Bumped by "Try again" so the load effect actually runs again.
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [status, setStatus] = useState<Record<SettingsGroup, GroupStatus>>({
    goals: IDLE,
    budgetAlerts: IDLE,
    reviewsReports: IDLE,
  })
  const queryClient = useQueryClient()

  // The form keeps its own editable copy, seeded from the shared preferences
  // cache (fetchQuery reuses fresh cached data, e.g. from the Review page).
  useEffect(() => {
    let active = true
    queryClient
      .fetchQuery(preferencesQuery())
      .then((preferences) => {
        if (!active) return
        const seeded = draftFromPreferences(preferences)
        setDraft(seeded)
        setSavedDraft(seeded)
      })
      .catch(() => {
        if (active) setLoadError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [queryClient, loadAttempt])

  // The browser's native #hash scroll fires on initial navigation, before
  // this client component has replaced SettingsLoading's skeleton with the
  // real form — so a deep link like /finance/settings#settings-categories
  // (used by the Financial Health "Unclassified spending" banner) lands on
  // a target that doesn't exist in the DOM yet and silently does nothing.
  // Re-attempting the scroll once loading finishes covers the fix without
  // touching how the settings page looks.
  useEffect(() => {
    if (loading) return
    const hash = window.location.hash
    if (!hash) return
    document.querySelector(hash)?.scrollIntoView({ block: "start" })
  }, [loading])

  function setGroupStatus(group: SettingsGroup, next: GroupStatus) {
    setStatus((current) => ({ ...current, [group]: next }))
  }

  function update<K extends keyof SettingsDraft>(field: K, value: SettingsDraft[K]) {
    setDraft((current) => (current ? { ...current, [field]: value } : current))
  }

  async function saveGroup(group: SettingsGroup, event: FormEvent) {
    event.preventDefault()
    if (!draft) return
    const result = GROUP_INPUT[group](draft)
    if (!result.ok) {
      setGroupStatus(group, { pending: false, saved: false, error: result.error })
      return
    }
    setGroupStatus(group, { pending: true, saved: false, error: null })
    try {
      const updated = await updatePreferences(result.input)
      // The saved copy lands in the cache directly (Review's on/off check);
      // thresholds and the money rule then refresh every view built on them.
      queryClient.setQueryData(financeKeys.preferences(), updated)
      void invalidateAfter(queryClient, "preferences")
      const fromServer = draftFromPreferences(updated)
      setSavedDraft(fromServer)
      // Only this group takes the server's values; edits in the others stay.
      setDraft((current) => (current ? mergeSavedGroup(group, current, fromServer) : current))
      setGroupStatus(group, { pending: false, saved: true, error: null })
    } catch {
      setGroupStatus(group, {
        pending: false,
        saved: false,
        error: "Couldn't save your settings. Try again.",
      })
    }
  }

  if (loadError) {
    return (
      <FinanceErrorState
        title="Finance settings unavailable"
        description="We couldn't load your Finance settings. Try again in a moment."
        onRetry={() => {
          setLoadError(false)
          setLoading(true)
          setLoadAttempt((attempt) => attempt + 1)
        }}
      />
    )
  }

  if (loading || !draft || !savedDraft) return <SettingsLoading />

  const groupProps = (group: SettingsGroup) => ({
    status: status[group],
    dirty: isGroupDirty(group, draft, savedDraft),
    onSubmit: (event: FormEvent) => void saveGroup(group, event),
  })
  const lifestylePct = toMoneyRule(
    Number(draft.essentialTargetPct) || 0,
    Number(draft.targetRate) || 0,
  ).lifestylePct

  return (
    <div className="space-y-10">
      <SettingsGroupForm
        id="settings-goals"
        title="Goals and money rule"
        description="Used for the daily spending guide, savings-rate framing, and the Essentials / Lifestyle / Future guideline on your Finance overview."
        saveLabel="Save goals"
        {...groupProps("goals")}
      >
        <FieldRow
          htmlFor="monthly-limit"
          label="Monthly spending limit (KRW)"
          description="Leave blank for no limit."
        >
          <Input
            id="monthly-limit"
            type="number"
            inputMode="numeric"
            min="0"
            step="1000"
            placeholder="No limit"
            aria-describedby="monthly-limit-hint"
            value={draft.monthlyLimit}
            onChange={(e) => update("monthlyLimit", e.target.value)}
          />
        </FieldRow>
        <FieldRow
          htmlFor="target-savings-rate"
          label="Target savings rate (%)"
          description="Also your money rule's Future minimum."
        >
          <Input
            id="target-savings-rate"
            aria-describedby="target-savings-rate-hint"
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            value={draft.targetRate}
            onChange={(e) => update("targetRate", e.target.value)}
          />
        </FieldRow>
        <div className="px-4 py-4 sm:px-5">
          <h3 id="settings-money-rule" className="text-base font-medium">
            Money rule
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Essentials and Lifestyle are maximums; Future is a minimum — Lifestyle is always the
            remainder of the other two. Pick a preset or set your own below.
          </p>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Money rule presets">
            {MONEY_RULE_PRESETS.map((preset) => {
              const active =
                Number(draft.essentialTargetPct) === preset.essentialTargetPct &&
                Number(draft.targetRate) === preset.targetSavingsRate
              return (
                <button
                  key={preset.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    update("essentialTargetPct", String(preset.essentialTargetPct))
                    update("targetRate", String(preset.targetSavingsRate))
                  }}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary text-foreground"
                      : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {active && <Check className="size-4 text-primary" aria-hidden="true" />}
                  {preset.label}
                  <span className="tabular-nums">
                    {preset.essentialTargetPct}/
                    {100 - preset.essentialTargetPct - preset.targetSavingsRate}/
                    {preset.targetSavingsRate}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <FieldRow htmlFor="essential-target-pct" label="Essentials max (%)">
          <Input
            id="essential-target-pct"
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            value={draft.essentialTargetPct}
            onChange={(e) => update("essentialTargetPct", e.target.value)}
          />
        </FieldRow>
        <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p id="lifestyle-label" className="text-sm font-medium">
              Lifestyle max (%)
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">Derived from the other two</p>
          </div>
          <output
            aria-labelledby="lifestyle-label"
            className="shrink-0 text-base font-semibold tabular-nums"
          >
            {lifestylePct}%
          </output>
        </div>
      </SettingsGroupForm>

      <SettingsGroupForm
        id="settings-budget-controls"
        title="Budget controls"
        description="When a budgeted category moves from Healthy to Watch to Near limit. Exceeded always means 100% or more."
        saveLabel="Save budget controls"
        {...groupProps("budgetAlerts")}
      >
        <FieldRow htmlFor="watch-threshold" label="Watch threshold (%)">
          <Input
            id="watch-threshold"
            type="number"
            inputMode="numeric"
            min="1"
            max="99"
            value={draft.watchThreshold}
            onChange={(e) => update("watchThreshold", e.target.value)}
          />
        </FieldRow>
        <FieldRow htmlFor="near-limit-threshold" label="Near-limit threshold (%)">
          <Input
            id="near-limit-threshold"
            type="number"
            inputMode="numeric"
            min="1"
            max="99"
            value={draft.nearLimitThreshold}
            onChange={(e) => update("nearLimitThreshold", e.target.value)}
          />
        </FieldRow>
      </SettingsGroupForm>

      <SettingsGroupForm
        id="settings-reviews"
        title="Reviews and email reports"
        description="Whether the Monthly Review screen is available, and how the Weekly summary and Monthly report reach you."
        saveLabel="Save reviews and reports"
        {...groupProps("reviewsReports")}
      >
        <SwitchRow
          id="monthly-review-enabled"
          label="Monthly review"
          description="Show the Monthly Review screen and its deterministic observations."
          checked={draft.monthlyReviewEnabled}
          onCheckedChange={(value) => update("monthlyReviewEnabled", value)}
        />
        <div className="px-4 pt-4 pb-1 sm:px-5">
          <h3 id="settings-email-reports" className="text-base font-medium">
            Email reports
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Leave the address blank to use your account email. No scheduler is deployed yet, so use
            the &ldquo;Send email&rdquo; button in Reports below to deliver one now.
          </p>
        </div>
        <FieldRow htmlFor="finance-report-email" label="Report email (optional)">
          <Input
            id="finance-report-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={draft.financeReportEmail}
            onChange={(e) => update("financeReportEmail", e.target.value)}
          />
        </FieldRow>
        <SwitchRow
          id="weekly-report-email"
          label="Weekly summary email"
          checked={draft.weeklyReportEmailEnabled}
          onCheckedChange={(value) => update("weeklyReportEmailEnabled", value)}
        />
        <SwitchRow
          id="monthly-report-email"
          label="Monthly report email"
          checked={draft.monthlyReportEmailEnabled}
          onCheckedChange={(value) => update("monthlyReportEmailEnabled", value)}
        />
      </SettingsGroupForm>

      {/* H-Space: Luyra's Appearance (theme) section is dropped — H-Space's own
          theme toggle in the header applies here too. Telegram linking and the
          AI Money Coach come with later migration steps (docs/LUYRA_MIGRATION.md). */}
      <FinanceSection
        id="settings-categories"
        title="Categories"
        description="How transactions are grouped, and what budgets are set against. A category still used by a transaction, budget, or template can't be deleted."
      >
        <CategoriesSection />
      </FinanceSection>

      <FinanceSection
        id="settings-payment-methods"
        title="Payment methods"
        description="How you paid — cards, cash, accounts. Used for the payment-method breakdown in Analytics."
      >
        <PaymentMethodsSection />
      </FinanceSection>

      <FinanceSection
        id="settings-reports"
        title="Reports"
        description="Deterministic weekly and monthly digests. Print them, email them, or send them to a linked Telegram chat."
      >
        <FinanceReportsSection />
      </FinanceSection>

      <FinanceSection
        id="settings-export"
        title="Export"
        description="Download your full transaction history, or open the current report as a printable page (use your browser's Print dialog to save as PDF)."
      >
        <ExportButtons />
      </FinanceSection>
    </div>
  )
}

/**
 * One group of preferences: a heading, its rows on one surface, and a footer
 * with that group's own Save. The Save is the filled (primary) button only
 * while the group has unsaved changes, so at most the group being edited
 * draws the eye.
 */
function SettingsGroupForm({
  id,
  title,
  description,
  saveLabel,
  status,
  dirty,
  onSubmit,
  children,
}: {
  id: string
  title: string
  description: string
  saveLabel: string
  status: GroupStatus
  dirty: boolean
  onSubmit: (event: FormEvent) => void
  children: ReactNode
}) {
  return (
    <FinanceSection id={id} title={title} description={description}>
      <form onSubmit={onSubmit} aria-labelledby={id}>
        <div className="app-surface divide-y divide-border overflow-hidden">
          {children}
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
            <div className="mr-auto min-w-0 text-sm">
              {status.error ? (
                <p className="text-destructive" role="alert">
                  {status.error}
                </p>
              ) : dirty ? (
                <p className="text-muted-foreground">Unsaved changes</p>
              ) : status.saved ? (
                <p className="flex items-center gap-1.5 text-success" role="status">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Saved.
                </p>
              ) : null}
            </div>
            <Button
              type="submit"
              size="sm"
              variant={dirty ? "default" : "outline"}
              disabled={status.pending}
              className="min-h-11 w-full xs:w-auto"
            >
              {status.pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {status.pending ? "Saving…" : saveLabel}
            </Button>
          </div>
        </div>
      </form>
    </FinanceSection>
  )
}

/** A label (and optional hint) beside its input; stacked on narrow phones. */
function FieldRow({
  htmlFor,
  label,
  description,
  children,
}: {
  htmlFor: string
  label: string
  description?: string
  children: ReactNode
}) {
  const hintId = description ? `${htmlFor}-hint` : undefined
  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5">
      <div className="min-w-0">
        <Label htmlFor={htmlFor}>{label}</Label>
        {description && (
          <p id={hintId} className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="w-full shrink-0 sm:w-48">{children}</div>
    </div>
  )
}

function SwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const hintId = description ? `${id}-hint` : undefined
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 py-1.5 pr-2 pl-4 sm:pl-5">
      <div className="min-w-0">
        <Label htmlFor={id}>{label}</Label>
        {description && (
          <p id={hintId} className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-describedby={hintId}
      />
    </div>
  )
}

// H-Space: Luyra used plain <a href> links, which worked with its session
// cookie. H-Space's session is a Bearer token in the browser, so the file is
// fetched with that token and handed to the browser as a download.
function ExportButtons() {
  const [busy, setBusy] = useState<"csv" | "json" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function download(format: "csv" | "json") {
    setBusy(format)
    setError(null)
    try {
      await downloadFinanceExport(format)
    } catch {
      setError("Couldn't download the export. Try again.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(["csv", "json"] as const).map((format) => (
          <Button
            key={format}
            type="button"
            variant="outline"
            onClick={() => void download(format)}
            disabled={busy !== null}
            className="min-h-11"
          >
            {busy === format ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileDown className="size-4" aria-hidden="true" />
            )}
            Download {format.toUpperCase()}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
