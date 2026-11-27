import { afterEach, describe, expect, it, vi } from "vitest"

// The admission self-read: own row only, fail closed, and a bounded wait.

const result = vi.hoisted(() => ({
  value: Promise.resolve({ data: [] as unknown, error: null as unknown }),
}))
const calls = vi.hoisted(() => [] as Array<[string, ...unknown[]]>)

vi.mock("@/lib/supabase", () => {
  const builder = {
    select: (...a: unknown[]) => (calls.push(["select", ...a]), builder),
    eq: (...a: unknown[]) => (calls.push(["eq", ...a]), builder),
    limit: (...a: unknown[]) => (calls.push(["limit", ...a]), builder),
    abortSignal: () => builder,
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      result.value.then(resolve, reject),
  }
  return { supabase: { from: (t: string) => (calls.push(["from", t]), builder) } }
})

import { admissionApi } from "./admission"

afterEach(() => {
  calls.length = 0
})

describe("admissionApi.check", () => {
  it("reads only the caller's own row from kori_app_access", async () => {
    result.value = Promise.resolve({ data: [{ status: "approved" }], error: null })
    await expect(admissionApi.check("user-1")).resolves.toBe("approved")
    expect(calls).toContainEqual(["from", "kori_app_access"])
    expect(calls).toContainEqual(["select", "status"])
    expect(calls).toContainEqual(["eq", "user_id", "user-1"])
  })

  it("no row → denied; error → unavailable; a thrown read → unavailable", async () => {
    result.value = Promise.resolve({ data: [], error: null })
    await expect(admissionApi.check("u")).resolves.toBe("denied")
    result.value = Promise.resolve({ data: null, error: { message: "x" } })
    await expect(admissionApi.check("u")).resolves.toBe("unavailable")
    result.value = Promise.reject(new TypeError("Failed to fetch"))
    await expect(admissionApi.check("u")).resolves.toBe("unavailable")
  })

  it("ACC-06: a read that never answers becomes unavailable after the timeout, never approved", async () => {
    result.value = new Promise(() => undefined)
    await expect(admissionApi.check("u", 20)).resolves.toBe("unavailable")
  })
})
