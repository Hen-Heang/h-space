import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { localNeonFetchEndpoint, vaultDatabaseUrl } from "./db"

const PROXY = "http://db.localtest.me:4444/sql"

describe("localNeonFetchEndpoint", () => {
  it("is off unless asked for, and always off in production", () => {
    expect(localNeonFetchEndpoint({ NODE_ENV: "development" })).toBeNull()
    expect(
      localNeonFetchEndpoint({ NODE_ENV: "production", VAULT_LOCAL_NEON_PROXY: PROXY }),
    ).toBeNull()
  })

  it("redirects only the local host and leaves every other host on Neon", () => {
    const endpoint = localNeonFetchEndpoint({
      NODE_ENV: "development",
      VAULT_LOCAL_NEON_PROXY: PROXY,
    })!
    expect(endpoint("db.localtest.me")).toBe(PROXY)
    expect(endpoint("ep-example-123.ap-southeast-1.aws.neon.tech")).toBe(
      "https://ep-example-123.ap-southeast-1.aws.neon.tech/sql",
    )
  })
})

describe("vaultDatabaseUrl", () => {
  it("accepts a postgres URL and nothing else", () => {
    expect(vaultDatabaseUrl({ VAULT_DATABASE_URL: "postgresql://u@h.example/db" })).toBe(
      "postgresql://u@h.example/db",
    )
    expect(vaultDatabaseUrl({ VAULT_DATABASE_URL: "" })).toBeNull()
    expect(vaultDatabaseUrl({ VAULT_DATABASE_URL: "https://h.example" })).toBeNull()
  })
})
