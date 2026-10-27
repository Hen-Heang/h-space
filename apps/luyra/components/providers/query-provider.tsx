"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { onTransactionChanged } from "@/lib/finance-events";
import { invalidateAfter } from "@/lib/query/finance-queries";

// A 4xx (validation, not found, unauthorized) won't succeed on a retry, and
// retrying it only delays the inline error state. Network failures and 5xx
// get one more attempt.
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status !== undefined && error.status < 500) return false;
  return failureCount < 1;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // One client per browser session; useState keeps it stable across renders
  // without sharing it between requests during server rendering.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: shouldRetry, refetchOnWindowFocus: false },
        },
      })
  );

  // Any create/edit/delete — from the list, quick add, or elsewhere — already
  // announces itself through emitTransactionChanged. Turning that into one
  // invalidation here keeps every transaction-derived view (lists, overview,
  // analytics, budget spend) honest without each writer knowing which exist.
  useEffect(() => onTransactionChanged(() => void invalidateAfter(client, "transaction")), [client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
