import { describe, expect, it } from "vitest"

import { buildContentSecurityPolicy } from "./csp"

const directive = (policy: string, name: string) =>
  policy
    .split("; ")
    .find((d) => d.startsWith(`${name} `))
    ?.split(" ")
    .slice(1) ?? []

const prod = buildContentSecurityPolicy({
  supabaseUrl: "https://project.supabase.co",
  authApiUrl: "https://api.example.com/",
  hspaceApiUrl: "https://api.example.com",
})

describe("content security policy", () => {
  it("only lets the page talk to the services it uses", () => {
    expect(directive(prod, "connect-src")).toEqual([
      "'self'",
      "https://project.supabase.co",
      "wss://project.supabase.co",
      "https://api.example.com",
      "https://accounts.google.com/gsi/",
      "https://api.openai.com",
      "https://api.open-meteo.com",
    ])
  })

  it("allows no third-party script but Google sign-in, and no eval in production", () => {
    const scripts = directive(prod, "script-src")
    expect(scripts).toContain("https://accounts.google.com/gsi/client")
    expect(scripts).not.toContain("'unsafe-eval'")
    expect(scripts.filter((s) => s.startsWith("https:"))).toHaveLength(1)
  })

  it("can't be framed, embed plugins, or post forms elsewhere", () => {
    expect(directive(prod, "frame-ancestors")).toEqual(["'none'"])
    expect(directive(prod, "object-src")).toEqual(["'none'"])
    expect(directive(prod, "form-action")).toEqual(["'self'"])
    expect(directive(prod, "base-uri")).toEqual(["'self'"])
    expect(prod).toContain("upgrade-insecure-requests")
  })

  it("adapts to local development and Vercel previews", () => {
    const dev = buildContentSecurityPolicy({ development: true })
    expect(directive(dev, "script-src")).toContain("'unsafe-eval'")
    expect(directive(dev, "connect-src")).toEqual(expect.arrayContaining(["http://localhost:8080", "ws:"]))
    expect(dev).not.toContain("upgrade-insecure-requests")

    const preview = buildContentSecurityPolicy({ vercelPreview: true })
    expect(directive(preview, "script-src")).toContain("https://vercel.live")
    expect(directive(prod, "script-src")).not.toContain("https://vercel.live")
  })

  it("ignores a malformed URL instead of emitting it", () => {
    const policy = buildContentSecurityPolicy({ supabaseUrl: "not a url" })
    expect(policy).not.toContain("not a url")
  })
})
