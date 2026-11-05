import { describe, expect, it } from "vitest"

import {
  buildJournalConversionPayload,
  buildNoteConversionPayload,
  buildTaskConversionPayload,
  collectInboxTags,
  filterInboxItems,
  isInboxItemInputValid,
  MAX_CONTENT_LENGTH,
  parseTagsInput,
  resolveInboxTag,
  slugifyInboxTitle,
  sortInboxItems,
  validateInboxItemInput,
  visibleInboxItems,
  type InboxItem,
} from "./inbox"

function makeItem(overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    id: "1",
    title: null,
    content: "Some captured thought",
    itemType: "idea",
    tags: [],
    capturedAt: "2026-07-20T00:00:00.000Z",
    eventAt: null,
    goalId: null,
    status: "inbox",
    source: "manual",
    pinned: false,
    convertedToType: null,
    convertedToId: null,
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  }
}

describe("validateInboxItemInput", () => {
  it("requires non-empty content", () => {
    const errors = validateInboxItemInput({ content: "   " })
    expect(errors.content).toBeTruthy()
  })

  it("rejects content over the max length", () => {
    const errors = validateInboxItemInput({ content: "a".repeat(MAX_CONTENT_LENGTH + 1) })
    expect(errors.content).toBeTruthy()
  })

  it("accepts valid content with no title", () => {
    expect(isInboxItemInputValid({ content: "Remember to review PR #42" })).toBe(true)
  })

  it("rejects an overlong title", () => {
    const errors = validateInboxItemInput({ title: "a".repeat(201), content: "ok" })
    expect(errors.title).toBeTruthy()
  })
})

describe("parseTagsInput", () => {
  it("trims, lowercases, and dedupes", () => {
    expect(parseTagsInput(" Korean, work , korean ,  ")).toEqual(["korean", "work"])
  })

  it("returns an empty array for blank input", () => {
    expect(parseTagsInput("   ,, ")).toEqual([])
  })
})

describe("filterInboxItems", () => {
  const items = [
    makeItem({
      id: "a",
      itemType: "idea",
      status: "inbox",
      tags: ["work"],
      content: "Ship the inbox feature",
    }),
    makeItem({
      id: "b",
      itemType: "phrase",
      status: "processed",
      tags: ["korean"],
      content: "회의 다녀왔습니다",
    }),
    makeItem({
      id: "c",
      itemType: "idea",
      status: "archived",
      tags: ["work", "later"],
      content: "Old idea",
    }),
  ]

  it("filters by type", () => {
    expect(filterInboxItems(items, { type: "phrase" }).map((i) => i.id)).toEqual(["b"])
  })

  it("filters by status", () => {
    expect(filterInboxItems(items, { status: "inbox" }).map((i) => i.id)).toEqual(["a"])
  })

  it("filters by tag", () => {
    expect(filterInboxItems(items, { tag: "later" }).map((i) => i.id)).toEqual(["c"])
  })

  it("matches search query against title and content", () => {
    expect(filterInboxItems(items, { query: "inbox feature" }).map((i) => i.id)).toEqual(["a"])
  })

  it("combines filters", () => {
    expect(filterInboxItems(items, { type: "idea", status: "archived" }).map((i) => i.id)).toEqual([
      "c",
    ])
  })

  it("returns everything for 'all'/empty filters", () => {
    expect(filterInboxItems(items, { type: "all", status: "all", query: "" })).toHaveLength(3)
  })
})

describe("sortInboxItems", () => {
  it("puts pinned items first, then newest first", () => {
    const items = [
      makeItem({ id: "old", capturedAt: "2026-07-01T00:00:00.000Z" }),
      makeItem({ id: "new", capturedAt: "2026-07-20T00:00:00.000Z" }),
      makeItem({ id: "pinned-old", capturedAt: "2026-06-01T00:00:00.000Z", pinned: true }),
    ]
    expect(sortInboxItems(items).map((i) => i.id)).toEqual(["pinned-old", "new", "old"])
  })
})

describe("collectInboxTags", () => {
  it("returns distinct, sorted tags", () => {
    const items = [makeItem({ tags: ["work", "korean"] }), makeItem({ tags: ["korean", "idea"] })]
    expect(collectInboxTags(items)).toEqual(["idea", "korean", "work"])
  })
})

describe("slugifyInboxTitle", () => {
  it("lowercases and hyphenates", () => {
    expect(slugifyInboxTitle("Spring Security JWT notes!")).toBe("spring-security-jwt-notes")
  })

  it("falls back to 'note' for empty input", () => {
    expect(slugifyInboxTitle("!!!")).toBe("note")
  })
})

describe("buildNoteConversionPayload", () => {
  it("derives title from content when no title is set", () => {
    const item = makeItem({ content: "PostgreSQL partial indexes are great for this" })
    const payload = buildNoteConversionPayload(item)
    expect(payload.title).toBe("PostgreSQL partial indexes are great for this")
    expect(payload.slug).toBe("postgresql-partial-indexes-are-great-for-this")
  })

  it("maps item type to a note type", () => {
    const item = makeItem({ itemType: "phrase", title: "회의" })
    expect(buildNoteConversionPayload(item).noteType).toBe("korean")
  })

  it("disambiguates a slug collision", () => {
    const item = makeItem({ title: "Duplicate" })
    const payload = buildNoteConversionPayload(item, ["duplicate", "duplicate-2"])
    expect(payload.slug).toBe("duplicate-3")
  })
})

describe("buildTaskConversionPayload", () => {
  it("maps content to description and carries goal/tags through", () => {
    const item = makeItem({
      title: "Fix flaky test",
      content: "The retry test flakes on CI",
      tags: ["dev"],
      goalId: "g1",
    })
    const payload = buildTaskConversionPayload(item, "2026-07-26")
    expect(payload).toMatchObject({
      title: "Fix flaky test",
      description: "The retry test flakes on CI",
      start_date: "2026-07-26",
      end_date: "2026-07-26",
      is_anytime: true,
      tags: ["dev"],
      goal_id: "g1",
    })
  })
})

describe("buildJournalConversionPayload", () => {
  it("prefers the event timestamp over the captured timestamp", () => {
    const item = makeItem({
      eventAt: "2026-07-19T00:00:00.000Z",
      capturedAt: "2026-07-20T00:00:00.000Z",
    })
    expect(buildJournalConversionPayload(item).occurredAt).toBe("2026-07-19T00:00:00.000Z")
  })

  it("falls back to the captured timestamp with no event timestamp", () => {
    const item = makeItem({ eventAt: null, capturedAt: "2026-07-20T00:00:00.000Z" })
    expect(buildJournalConversionPayload(item).occurredAt).toBe("2026-07-20T00:00:00.000Z")
  })

  it("carries title, content, and tags through unchanged", () => {
    const item = makeItem({ title: "Reflection", content: "Today was productive", tags: ["work"] })
    expect(buildJournalConversionPayload(item)).toMatchObject({
      title: "Reflection",
      content: "Today was productive",
      tags: ["work"],
    })
  })
})

describe("visibleInboxItems", () => {
  const items = [
    makeItem({ id: "a", tags: ["work"], content: "Plan the week" }),
    makeItem({ id: "b", tags: ["home"], content: "Plan the garden", pinned: true }),
    makeItem({ id: "c", tags: [], content: "Unrelated thought" }),
  ]

  it("applies the chosen tag (the page used to drop it)", () => {
    expect(visibleInboxItems(items, { tag: "work" }).map((i) => i.id)).toEqual(["a"])
  })

  it("combines search text and tag", () => {
    expect(visibleInboxItems(items, { query: "plan", tag: "home" }).map((i) => i.id)).toEqual(["b"])
    expect(visibleInboxItems(items, { query: "unrelated", tag: "work" })).toEqual([])
  })

  it("lists pinned items first", () => {
    expect(visibleInboxItems(items, { query: "plan" }).map((i) => i.id)).toEqual(["b", "a"])
  })

  it("ignores a tag that no loaded item carries any more", () => {
    expect(visibleInboxItems(items, { tag: "gone" })).toHaveLength(3)
    expect(resolveInboxTag("gone", ["work"])).toBe("all")
    expect(resolveInboxTag("work", ["work"])).toBe("work")
    expect(resolveInboxTag(undefined, ["work"])).toBe("all")
  })
})
