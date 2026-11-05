// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth-store", () => ({ getUserId: () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }))

import { emitTransactionChanged } from "@/lib/finance-events"
import { financeKeys } from "@/lib/query/finance-queries"
import { FinanceEventsBridge } from "./finance-events-bridge"

afterEach(() => vi.restoreAllMocks())

function renderBridge() {
  const queryClient = new QueryClient()
  const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  const view = render(
    <QueryClientProvider client={queryClient}>
      <FinanceEventsBridge />
    </QueryClientProvider>,
  )
  return { invalidate, view }
}

describe("FinanceEventsBridge", () => {
  it("refreshes transaction-based views when a transaction changes", () => {
    const { invalidate } = renderBridge()
    emitTransactionChanged()
    const keys = invalidate.mock.calls.map(([filters]) => JSON.stringify(filters?.queryKey))
    for (const key of [
      financeKeys.transactions(),
      financeKeys.overview(),
      financeKeys.analytics(),
      financeKeys.budgets(),
    ]) {
      expect(keys).toContain(JSON.stringify(key))
    }
  })

  it("stops listening once unmounted", () => {
    const { invalidate, view } = renderBridge()
    view.unmount()
    emitTransactionChanged()
    expect(invalidate).not.toHaveBeenCalled()
  })
})
