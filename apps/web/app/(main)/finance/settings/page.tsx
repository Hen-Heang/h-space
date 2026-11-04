import { FinanceSettingsForm } from "@/components/finance/settings/finance-settings-form"

// Luyra's settings page also had a Push notifications section; Web Push moves
// over with the alerts and connections steps (docs/LUYRA_MIGRATION.md).
export default function FinanceSettingsPage() {
  return <FinanceSettingsForm />
}
