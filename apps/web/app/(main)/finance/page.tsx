import { FinanceOverview } from "@/components/finance/finance-overview"

// Luyra prefetched the summary on the server from its session cookie. H-Space
// keeps the session in the browser, so the overview fetches on mount instead.
export default function FinancePage() {
  return <FinanceOverview />
}
