import { afterEach, describe, expect, it, vi } from "vitest"

const { redirect } = vi.hoisted(() => ({
  // next/navigation's redirect() never returns; it throws to abort the render.
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`)
  }),
}))
vi.mock("next/navigation", () => ({ redirect }))

import NotesLayout from "./layout"

describe("Notes route layout", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    redirect.mockClear()
  })

  it("sends every /notes* page to the Inbox while Notes is retired (the default)", () => {
    expect(() => NotesLayout({ children: "notes page" })).toThrow("NEXT_REDIRECT /inbox")
    expect(redirect).toHaveBeenCalledWith("/inbox")
  })

  it("treats anything other than \"true\" as off", () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_NOTES", "1")
    expect(() => NotesLayout({ children: "notes page" })).toThrow("NEXT_REDIRECT /inbox")
  })

  it("renders the Notes page again with NEXT_PUBLIC_FEATURE_NOTES=true", () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_NOTES", "true")
    expect(NotesLayout({ children: "notes page" })).toBe("notes page")
    expect(redirect).not.toHaveBeenCalled()
  })
})
