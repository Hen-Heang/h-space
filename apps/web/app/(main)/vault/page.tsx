import { WorkspaceTabs } from "@/components/layout/WorkspaceTabs"
import { VaultDashboard } from "@/components/vault/VaultDashboard"

// H-Vault — private account directory, end-to-end encrypted in the browser.
// Lives inside the authenticated (main) shell; the data boundary is
// hspace-api's owner and MFA checks plus the encryption, not this route.
// See docs/h-vault.md.
export default function VaultPage() {
  return (
    <div className="space-y-6">
      <WorkspaceTabs sectionId="apps" />
      <VaultDashboard />
    </div>
  )
}
