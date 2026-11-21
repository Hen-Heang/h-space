import { afterEach, describe, expect, it, vi } from "vitest"

import { AuthApiError } from "./auth-http"
import { HSPACE_UNAVAILABLE_MESSAGE, hspaceRequest } from "./hspace-http"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("hspaceRequest", () => {
  it("fails with 503 and sends nothing — h-space-api is being retired", async () => {
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal("fetch", fetchMock)

    const error = await hspaceRequest("/api/hub/vault/items", { method: "GET" }).catch((e) => e)

    expect(error).toBeInstanceOf(AuthApiError)
    expect(error).toMatchObject({ httpStatus: 503, message: HSPACE_UNAVAILABLE_MESSAGE })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
