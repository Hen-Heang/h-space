import { FinanceEventsBridge } from "@/components/finance/finance-events-bridge"
import { FinanceNav } from "@/components/finance/finance-nav"
import { FinanceSessionBoundary } from "@/components/finance/finance-session-boundary"
import { QuickAddTransaction } from "@/components/finance/transactions/quick-add-transaction"
import "./luyra-theme.css"

// Finance, moved in from Luyra (docs/LUYRA_MIGRATION.md). The `luyra` class
// scopes Finance's money colours (income green, watch amber, chart palette);
// everything else is H-Space's own design system. Data comes from
// app/api/finance/*, which reads the finance database for the linked account
// only.
//
// pb-16 keeps the last row of every Finance page scrollable clear of the
// floating "Add transaction" button.
export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="luyra mx-auto flex w-full max-w-4xl flex-col gap-6 pb-16">
      <FinanceSessionBoundary>
        <FinanceNav />
        {children}
        {/* Floating "+ add transaction" on every Finance page (Luyra's quick add). */}
        <QuickAddTransaction />
        <FinanceEventsBridge />
      </FinanceSessionBoundary>
    </div>
  )
}
