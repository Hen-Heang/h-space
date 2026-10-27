import { afterEach, describe, expect, it, vi } from "vitest"

import { AuthApiError, authRequest } from "./auth-http"

function respond(body: unknown, status: number) {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("authRequest", () => {
  it("unwraps data on success", async () => {
    respond({ status: { code: 200, message: "Success" }, data: { available: true } }, 200)
    await expect(authRequest("/api/auth/username-available?username=x")).resolves.toEqual({
      available: true,
    })
  })

  it("throws the envelope's status message and code", async () => {
    respond(
      {
        status: { code: 1001, message: "Invalid email, username or password" },
        data: "Invalid email, username or password",
      },
      401,
    )
    const error = await authRequest("/api/auth/login", { method: "POST", body: {} }).catch(
      (e: unknown) => e,
    )
    expect(error).toBeInstanceOf(AuthApiError)
    expect(error).toMatchObject({
      message: "Invalid email, username or password",
      httpStatus: 401,
      code: 1001,
    })
  })

  it("reads the message from data for older backends that sent every error as 5000", async () => {
    respond(
      { status: { code: 5000, message: "System error" }, data: "Invalid email or password" },
      401,
    )
    await expect(authRequest("/api/auth/login", { method: "POST", body: {} })).rejects.toThrow(
      "Invalid email or password",
    )
  })

  it("reports an unreachable server distinctly", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed")))
    await expect(authRequest("/api/public/ping")).rejects.toMatchObject({ httpStatus: 0 })
  })
})
