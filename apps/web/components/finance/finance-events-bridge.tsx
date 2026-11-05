"use client"

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { onTransactionChanged } from "@/lib/finance-events"
import { invalidateAfter } from "@/lib/query/finance-queries"

/**
 * When a transaction is added, edited or deleted anywhere in Finance (the
 * quick-add button, the Transactions page), refetch every view built on
 * transactions: the lists, Overview, Analytics and Budgets.
 *
 * Luyra wired this in its app-wide QueryProvider; H-Space's providers are
 * shared with the rest of the app, so the listener lives in the Finance
 * layout instead. Without it, e.g. a quick add from Overview left the
 * Overview totals stale until a reload.
 */
export function FinanceEventsBridge() {
  const queryClient = useQueryClient()
  useEffect(
    () => onTransactionChanged(() => void invalidateAfter(queryClient, "transaction")),
    [queryClient],
  )
  return null
}
