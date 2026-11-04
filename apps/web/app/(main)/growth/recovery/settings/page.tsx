"use client"

import { RecoveryPrivacyPanel } from "@/components/recovery/RecoveryPrivacyPanel"
import { BackLink } from "@/components/ui/back-link"
import { ErrorBanner } from "@/components/ui/error-banner"
import { useRecoveryPrivacy } from "@/hooks/useRecovery"

export default function RecoverySettingsPage() {
  const { settings, loading, error, saveSettings, exportData, deleteAllData } = useRecoveryPrivacy()
  if (loading) return null
  if (error)
    return (
      <div className="mx-auto max-w-3xl pt-10">
        <ErrorBanner>{error}</ErrorBanner>
      </div>
    )
  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-14">
      <BackLink href="/growth/recovery" label="Recovery" />
      <div>
        <p className="app-kicker">Privacy settings</p>
        <h2 className="mt-1 text-2xl font-semibold">Private by default, controlled by you</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Recovery records use the same authenticated Supabase session as Hengo and owner-only row
          policies.
        </p>
      </div>
      <RecoveryPrivacyPanel
        settings={settings}
        onSave={saveSettings}
        onExport={exportData}
        onDelete={deleteAllData}
      />
    </div>
  )
}
