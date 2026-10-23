import { WorkspaceTabs } from "@/components/layout/WorkspaceTabs"
import { VaultDashboard } from "@/components/vault/VaultDashboard"

// H-Vault — private account directory (metadata only; passwords stay in
// Bitwarden). Lives inside the authenticated (main) shell; the data boundary
// is RLS on kori_vault_accounts, not this route. See docs/h-vault.md.
export default function VaultPage() {
  return (
    <div className="space-y-6">
      <WorkspaceTabs sectionId="apps" />
      <VaultDashboard />
    </div>
  )
}
