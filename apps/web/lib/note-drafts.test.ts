import { describe, expect, it } from "vitest"

import {
  draftRestoreAction,
  noteDraftKey,
  parseNoteDraft,
  sameDraftValues,
  serializeNoteDraft,
  type StoredNoteDraft,
} from "./note-drafts"

type Values = { title: string; content: string; projectId: string }

const initial: Values = { title: "A", content: "Body", projectId: "" }
const changed: Values = { ...initial, content: "Body, edited" }

const draft = (
  values: Values,
  baseUpdatedAt: string | null,
  legacy = false,
): StoredNoteDraft<Values> => ({ values, baseUpdatedAt, legacy })

describe("noteDraftKey", () => {
  it("keeps the existing keys for edit and plain new-note drafts", () => {
    expect(noteDraftKey("edit", "my-note")).toBe("hengo-note-draft:my-note")
    expect(noteDraftKey("create", "")).toBe("hengo-note-draft:new")
  })

  it("gives a new note started in a project its own key", () => {
    expect(noteDraftKey("create", "", "p1")).toBe("hengo-note-draft:new:p1")
    expect(noteDraftKey("create", "", "p1")).not.toBe(noteDraftKey("create", "", "p2"))
  })

  it("ignores the project for edit drafts", () => {
    expect(noteDraftKey("edit", "my-note", "p1")).toBe("hengo-note-draft:my-note")
  })
})

describe("serializeNoteDraft / parseNoteDraft", () => {
  it("round-trips values and the base version", () => {
    const parsed = parseNoteDraft<Values>(serializeNoteDraft(changed, "2026-11-09T01:00:00Z"))
    expect(parsed).toEqual(draft(changed, "2026-11-09T01:00:00Z"))
  })

  it("reads a draft written before versioning as legacy, with no base", () => {
    expect(parseNoteDraft<Values>(JSON.stringify(changed))).toEqual(draft(changed, null, true))
  })

  it.each([null, "", "not json", "[]", "null", "42", '{"v":2,"values":null}'])(
    "returns null for %j",
    (raw) => {
      expect(parseNoteDraft(raw)).toBeNull()
    },
  )
})

describe("sameDraftValues", () => {
  it("ignores key order and compares arrays by value", () => {
    expect(sameDraftValues({ a: 1, tags: ["x"] }, { tags: ["x"], a: 1 })).toBe(true)
    expect(sameDraftValues({ tags: ["x"] }, { tags: ["x", "y"] })).toBe(false)
    expect(sameDraftValues({ a: 1 }, { a: 1, b: undefined })).toBe(true)
  })
})

describe("draftRestoreAction", () => {
  const base = "2026-11-09T01:00:00Z"

  it("discards a draft with no changes, in either mode", () => {
    expect(draftRestoreAction({ mode: "create", draft: draft(initial, null), initial, baseUpdatedAt: null })).toBe("discard")
    expect(draftRestoreAction({ mode: "edit", draft: draft(initial, "old"), initial, baseUpdatedAt: base })).toBe("discard")
  })

  it("treats fields missing from an older draft as unchanged", () => {
    const partial = draft({ title: "A", content: "Body" } as Values, null, true)
    expect(draftRestoreAction({ mode: "create", draft: partial, initial, baseUpdatedAt: null })).toBe("discard")
  })

  it("applies a new-note draft with changes", () => {
    expect(draftRestoreAction({ mode: "create", draft: draft(changed, null), initial, baseUpdatedAt: null })).toBe("apply")
  })

  it("applies an edit draft that started from the note's current version", () => {
    expect(draftRestoreAction({ mode: "edit", draft: draft(changed, base), initial, baseUpdatedAt: base })).toBe("apply")
  })

  it("asks when the note changed after the draft started", () => {
    expect(
      draftRestoreAction({ mode: "edit", draft: draft(changed, base), initial, baseUpdatedAt: "2026-11-09T02:00:00Z" }),
    ).toBe("ask")
  })

  it("asks for a legacy edit draft, whose base version is unknown", () => {
    expect(draftRestoreAction({ mode: "edit", draft: draft(changed, null, true), initial, baseUpdatedAt: base })).toBe("ask")
  })

  it("asks when the current version is unknown", () => {
    expect(draftRestoreAction({ mode: "edit", draft: draft(changed, base), initial, baseUpdatedAt: null })).toBe("ask")
  })
})
