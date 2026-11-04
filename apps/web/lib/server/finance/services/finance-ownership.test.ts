import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
const findCategoryById = vi.fn()
const findPaymentMethodById = vi.fn()
vi.mock("@/lib/server/finance/repositories/finance-lookup-repository", () => ({
  findCategoryById: (...args: unknown[]) => findCategoryById(...args),
  findPaymentMethodById: (...args: unknown[]) => findPaymentMethodById(...args),
}))

import { AppError } from "@/lib/server/finance/errors"
import { assertOwnedReferences } from "./finance-ownership"

// Synthetic ids only.
const USER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const CATEGORY = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const METHOD = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"

afterEach(() => vi.resetAllMocks())

describe("assertOwnedReferences", () => {
  it("passes when both references belong to the user, checking with the user's id", async () => {
    findCategoryById.mockResolvedValue({ id: CATEGORY })
    findPaymentMethodById.mockResolvedValue({ id: METHOD })
    await expect(assertOwnedReferences(USER, { categoryId: CATEGORY, paymentMethodId: METHOD })).resolves.toBeUndefined()
    expect(findCategoryById).toHaveBeenCalledWith(CATEGORY, USER)
    expect(findPaymentMethodById).toHaveBeenCalledWith(METHOD, USER)
  })

  it("skips lookups for absent or null references", async () => {
    await assertOwnedReferences(USER, { categoryId: null, paymentMethodId: undefined })
    expect(findCategoryById).not.toHaveBeenCalled()
    expect(findPaymentMethodById).not.toHaveBeenCalled()
  })

  it("rejects another user's category with 422", async () => {
    findCategoryById.mockResolvedValue(null)
    const error = await assertOwnedReferences(USER, { categoryId: CATEGORY }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).status).toBe(422)
  })

  it("rejects another user's payment method with 422", async () => {
    findPaymentMethodById.mockResolvedValue(null)
    const error = await assertOwnedReferences(USER, { paymentMethodId: METHOD }).catch((e: unknown) => e)
    expect((error as AppError).status).toBe(422)
  })
})
