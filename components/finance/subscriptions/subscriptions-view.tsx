"use client";

import { useCallback, useEffect, useState } from "react";
import { Repeat } from "lucide-react";
import { FinanceEmptyState, FinanceErrorState, FinanceMetricGrid, FinanceSection } from "@/components/finance/ui/finance-primitives";
import { SubscriptionsSummary } from "@/components/finance/subscriptions/subscriptions-summary";
import { SubscriptionCard } from "@/components/finance/subscriptions/subscription-card";
import { MerchantNamesSection } from "@/components/finance/subscriptions/merchant-names-section";
import { listDetectedSubscriptions, setSubscriptionStatus } from "@/lib/api/finance";
import type { DetectedSubscription, SubscriptionStatus } from "@/types/finance";

function SubscriptionsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading subscriptions">
      <FinanceMetricGrid>
        {[0, 1, 2, 3].map((card) => (
          <div key={card} className="h-24 rounded-2xl bg-secondary motion-safe:animate-pulse" />
        ))}
      </FinanceMetricGrid>
      <div className="space-y-3">
        {[0, 1, 2].map((card) => (
          <div key={card} className="h-28 rounded-2xl bg-secondary motion-safe:animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// Detected from repeated payments to the same merchant (see
// lib/services/finance-subscription-service.ts). Spelling variants group
// automatically; the Merchant names section below merges the rest.
export function SubscriptionsView() {
  const [reloadToken, setReloadToken] = useState(0);
  const [subscriptions, setSubscriptions] = useState<DetectedSubscription[]>([]);
  const [result, setResult] = useState<{ key: number; error: string | null }>({ key: -1, error: null });
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const loading = result.key !== reloadToken;

  const load = useCallback(() => {
    listDetectedSubscriptions()
      .then((data) => {
        setSubscriptions(data);
        setResult({ key: reloadToken, error: null });
      })
      .catch(() => setResult({ key: reloadToken, error: "We couldn't load your subscriptions. Try again in a moment." }));
  }, [reloadToken]);

  useEffect(() => {
    load();
  }, [load]);

  function refresh() {
    setReloadToken((token) => token + 1);
  }

  async function updateStatus(subscription: DetectedSubscription, status: SubscriptionStatus) {
    if (subscription.status === status) return;
    setSavingKey(subscription.key);
    setActionError(null);
    setSubscriptions((prev) => prev.map((s) => (s.key === subscription.key ? { ...s, status } : s)));
    try {
      await setSubscriptionStatus(subscription.key, { displayName: subscription.name, status });
    } catch {
      setSubscriptions((prev) => prev.map((s) => (s.key === subscription.key ? { ...s, status: subscription.status } : s)));
      setActionError("Couldn't save that change. Try again.");
    } finally {
      setSavingKey(null);
    }
  }

  const sorted = [...subscriptions].sort((a, b) => {
    const aCancelled = a.status === "cancelled" ? 1 : 0;
    const bCancelled = b.status === "cancelled" ? 1 : 0;
    return aCancelled - bCancelled;
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Detected from repeated payments in your transactions over the last 6 months. Luyra never cancels anything for
        you — this is a note to yourself.
      </p>

      {result.error ? (
        <FinanceErrorState title="Subscriptions unavailable" description={result.error} onRetry={refresh} />
      ) : loading ? (
        <SubscriptionsLoading />
      ) : subscriptions.length === 0 ? (
        <FinanceEmptyState
          icon={Repeat}
          title="No recurring payments found"
          description="Once a payment repeats a couple of times, it shows up here."
        />
      ) : (
        <>
          <FinanceSection id="subscriptions-summary" title="Summary" description="Estimated recurring cost across detected subscriptions.">
            <SubscriptionsSummary subscriptions={subscriptions} />
          </FinanceSection>

          {actionError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
              {actionError}
            </p>
          )}

          <FinanceSection id="subscriptions-list" title="Detected subscriptions" description="Decide what to keep, review, or cancel.">
            <div className="space-y-3">
              {sorted.map((subscription) => (
                <SubscriptionCard
                  key={subscription.key}
                  subscription={subscription}
                  saving={savingKey === subscription.key}
                  onStatusChange={(status) => updateStatus(subscription, status)}
                />
              ))}
            </div>
          </FinanceSection>
        </>
      )}

      {!result.error && !loading && (
        <FinanceSection
          id="subscriptions-merchant-names"
          title="Merchant names"
          description="Merge different names for the same merchant so its payments count together. Your transactions keep their original descriptions."
        >
          <MerchantNamesSection onChanged={refresh} />
        </FinanceSection>
      )}
    </div>
  );
}
