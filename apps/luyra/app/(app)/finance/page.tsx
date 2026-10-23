import { FinanceOverview } from "@/components/finance/finance-overview";
import { GreetingHeader } from "@/components/layout/GreetingHeader";
import { requireAppUserSession } from "@/lib/auth/ensure-app-user";
import { appMonth } from "@/lib/finance-cron-time";
import { getFinanceOverviewSummary } from "@/lib/services/finance-analytics-service";
import type { FinanceOverviewSummary } from "@/types/finance";

// The summary is fetched on the server so the amounts land in the first paint
// instead of arriving after a client fetch. `appMonth()` pins the prefetched
// month to Asia/Seoul; the client compares it against its own current month
// and falls back to fetching if a traveling browser disagrees. A failed
// prefetch is logged and the page degrades to fetch-on-mount — the client owns
// the retry and error state, and shows the API's status if that fails too.
export default async function FinancePage() {
  const month = appMonth();
  const { userId, appUser: appUserPromise } = await requireAppUserSession();

  // The profile read and the summary queries are independent reads keyed by
  // the verified session id, so they run concurrently.
  const [appUser, summary] = await Promise.all([
    appUserPromise,
    getFinanceOverviewSummary(userId, month).catch((error: unknown): FinanceOverviewSummary | undefined => {
      console.error("[finance] overview prefetch failed", error);
      return undefined;
    }),
  ]);

  return (
    <div className="space-y-6 lg:space-y-7">
      <GreetingHeader user={appUser} />
      <FinanceOverview initialMonth={month} initialSummary={summary} />
    </div>
  );
}
