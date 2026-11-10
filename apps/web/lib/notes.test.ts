import { describe, expect, it } from "vitest"

import {
  filterNotesMeta,
  generatedNoteSlug,
  isNoteInputValid,
  noteSlugFromTitle,
  readingMinutes,
  MAX_NOTE_CONTENT_LENGTH,
  MAX_NOTE_TITLE_LENGTH,
  sortNotesMeta,
  validateNoteInput,
  type NoteMeta,
} from "./notes"

function makeNote(overrides: Partial<NoteMeta> = {}): NoteMeta {
  return {
    slug: "note",
    title: "A note",
    description: "",
    icon: "common",
    noteType: "technical",
    tags: [],
    pinned: false,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("validateNoteInput", () => {
  it("requires a title", () => {
    expect(validateNoteInput({ title: "  ", content: "ok" }).title).toBeTruthy()
  })

  it("requires content", () => {
    expect(validateNoteInput({ title: "ok", content: "  " }).content).toBeTruthy()
  })

  it("rejects an overlong title", () => {
    expect(
      validateNoteInput({ title: "a".repeat(MAX_NOTE_TITLE_LENGTH + 1), content: "ok" }).title,
    ).toBeTruthy()
  })

  it("rejects overlong content", () => {
    expect(
      validateNoteInput({ title: "ok", content: "a".repeat(MAX_NOTE_CONTENT_LENGTH + 1) }).content,
    ).toBeTruthy()
  })

  it("accepts a note with no source URL", () => {
    expect(isNoteInputValid({ title: "Title", content: "Body" })).toBe(true)
  })

  it("accepts a valid http(s) source URL", () => {
    expect(
      validateNoteInput({ title: "t", content: "c", sourceUrl: "https://example.com/docs" })
        .sourceUrl,
    ).toBeUndefined()
  })

  it("rejects a malformed source URL", () => {
    expect(
      validateNoteInput({ title: "t", content: "c", sourceUrl: "not a url" }).sourceUrl,
    ).toBeTruthy()
  })

  it("rejects a non-http(s) source URL", () => {
    expect(
      validateNoteInput({ title: "t", content: "c", sourceUrl: "javascript:alert(1)" }).sourceUrl,
    ).toBeTruthy()
  })
})

describe("filterNotesMeta", () => {
  const notes = [
    makeNote({ slug: "a", noteType: "technical", pinned: true, title: "Spring Boot notes" }),
    makeNote({
      slug: "b",
      noteType: "korean",
      pinned: false,
      title: "Workplace phrases",
      tags: ["office"],
    }),
    makeNote({
      slug: "c",
      noteType: "technical",
      pinned: false,
      title: "SQL indexes",
      description: "postgres",
    }),
  ]

  it("filters by note type", () => {
    expect(filterNotesMeta(notes, { noteType: "korean" }).map((n) => n.slug)).toEqual(["b"])
  })

  it("filters by pinned-only", () => {
    expect(filterNotesMeta(notes, { pinnedOnly: true }).map((n) => n.slug)).toEqual(["a"])
  })

  it("matches query against title, description, and tags", () => {
    expect(filterNotesMeta(notes, { query: "postgres" }).map((n) => n.slug)).toEqual(["c"])
    expect(filterNotesMeta(notes, { query: "office" }).map((n) => n.slug)).toEqual(["b"])
  })

  it("combines filters", () => {
    expect(
      filterNotesMeta(notes, { noteType: "technical", pinnedOnly: true }).map((n) => n.slug),
    ).toEqual(["a"])
  })
})

describe("sortNotesMeta", () => {
  it("puts pinned notes first, then most recently updated", () => {
    const notes = [
      makeNote({ slug: "old", updatedAt: "2026-07-01T00:00:00.000Z" }),
      makeNote({ slug: "new", updatedAt: "2026-07-20T00:00:00.000Z" }),
      makeNote({ slug: "pinned-old", updatedAt: "2026-06-01T00:00:00.000Z", pinned: true }),
    ]
    expect(sortNotesMeta(notes).map((n) => n.slug)).toEqual(["pinned-old", "new", "old"])
  })
})

describe("isReservedNoteSlug", () => {
  it("blocks slugs that collide with /notes routes", async () => {
    const { isReservedNoteSlug } = await import("./notes")
    expect(isReservedNoteSlug("new")).toBe(true)
    expect(isReservedNoteSlug(" Projects ")).toBe(true)
    expect(isReservedNoteSlug("project-notes")).toBe(false)
  })
})

describe("generatedNoteSlug", () => {
  it("uses the local date and four base-36 characters", () => {
    const values = [0, 0.5, 0.99, 0.1]
    const slug = generatedNoteSlug(new Date(2026, 10, 9, 23, 30), () => values.shift() ?? 0)
    expect(slug).toBe("note-20261109-0iz3")
  })

  it("always produces a valid, non-reserved slug", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generatedNoteSlug()).toMatch(/^note-\d{8}-[a-z0-9]{4}$/)
    }
  })
})

describe("noteSlugFromTitle", () => {
  it("slugifies titles with ASCII letters or digits", () => {
    expect(noteSlugFromTitle("Spring Boot tips", "fallback")).toBe("spring-boot-tips")
    expect(noteSlugFromTitle("Java 공부 2", "fallback")).toBe("java-2")
  })

  it("falls back for Korean and Khmer titles", () => {
    expect(noteSlugFromTitle("한국어 공부", "note-20261109-abcd")).toBe("note-20261109-abcd")
    expect(noteSlugFromTitle("ការសិក្សា", "note-20261109-abcd")).toBe("note-20261109-abcd")
  })
})

describe("readingMinutes", () => {
  it("is at least one minute", () => {
    expect(readingMinutes("")).toBe(1)
    expect(readingMinutes("# Title\n\nShort.")).toBe(1)
  })

  it("counts space-separated words at about 220 a minute", () => {
    expect(readingMinutes(Array(660).fill("word").join(" "))).toBe(3)
  })

  it("counts Hangul by character, so Korean notes aren't undercounted", () => {
    expect(readingMinutes("가".repeat(1000))).toBe(2)
    expect(readingMinutes(`${"가".repeat(500)} ${Array(220).fill("word").join(" ")}`)).toBe(2)
  })

  it("ignores markdown punctuation", () => {
    expect(readingMinutes("## ### > ** __ `` ~~ [](-) |".repeat(500))).toBe(1)
  })
})
