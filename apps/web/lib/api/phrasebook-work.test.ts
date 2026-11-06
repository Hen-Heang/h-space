// Persistence tests for "Save to Phrasebook" (phrasebookApi.saveWorkCapture).
//
// SAFETY: `@/lib/supabase` is replaced by an in-memory fake before the module
// under test is imported — no network client is built and nothing can reach
// a live project. The fake models the database rules the code relies on:
// RLS (rows are only visible to their owner), the (user_id, source_key)
// unique indexes, the card→collection ownership trigger, and — optionally —
// a database where migration 20261106120000 hasn't been applied yet.

import { beforeEach, describe, expect, it, vi } from "vitest"

type Row = Record<string, unknown>
type Result = { data: unknown; error: { code: string; message: string } | null }

const db: Record<string, Row[]> = { kori_phrase_collections: [], kori_phrase_cards: [] }
let currentUser = "user-a"
let migrationApplied = true
let insertCalls = 0
let idSeq = 0

const NEW_COLUMNS = ["work_context", "provenance", "source_label"]

function visible(table: string) {
  return db[table].filter((r) => r.user_id === currentUser) // RLS
}

function insertRow(table: string, row: Row): Result {
  insertCalls += 1
  if (row.user_id !== currentUser) return { data: null, error: { code: "42501", message: "rls" } }
  if (!migrationApplied && table === "kori_phrase_cards" && NEW_COLUMNS.some((c) => c in row))
    return { data: null, error: { code: "PGRST204", message: "column not found" } }
  if (table === "kori_phrase_cards") {
    const owns = db.kori_phrase_collections.some(
      (c) => c.id === row.collection_id && c.user_id === row.user_id,
    )
    if (!owns) return { data: null, error: { code: "P0001", message: "collection not owned" } }
  }
  if (
    row.source_key != null &&
    db[table].some((r) => r.user_id === row.user_id && r.source_key === row.source_key)
  )
    return { data: null, error: { code: "23505", message: "duplicate key" } }
  const stored: Row = {
    id: `${table}-${++idSeq}`,
    created_at: "2026-11-06T00:00:00.000Z",
    updated_at: "2026-11-06T00:00:00.000Z",
    position: 0,
    active: true,
    question_variants: [],
    vocabulary: [],
    tags: [],
    usage_note: null,
    ...row,
  }
  db[table].push(stored)
  return { data: stored, error: null }
}

function builder(table: string) {
  const filters: Array<[string, unknown]> = []
  let pendingInsert: Row | null = null
  const rows = () => visible(table).filter((r) => filters.every(([k, v]) => r[k] === v))
  const b = {
    select: () => b,
    eq: (k: string, v: unknown) => {
      filters.push([k, v])
      return b
    },
    insert: (row: Row) => {
      pendingInsert = row
      return b
    },
    maybeSingle: async (): Promise<Result> => ({ data: rows()[0] ?? null, error: null }),
    single: async (): Promise<Result> => {
      if (pendingInsert) return insertRow(table, pendingInsert)
      const [first] = rows()
      return first
        ? { data: first, error: null }
        : { data: null, error: { code: "PGRST116", message: "no rows" } }
    },
  }
  return b
}

vi.mock("@/lib/supabase", () => ({ supabase: { from: (table: string) => builder(table) } }))
vi.mock("@/lib/auth-store", () => ({
  requireUserId: () => currentUser,
  getUserId: () => currentUser,
}))

import { phrasebookApi } from "./phrasebook"
import {
  buildWorkCardDraft,
  draftToCardContent,
  WORK_CAPTURE_COLLECTION_KEY,
} from "@/lib/korean-phrasebook/work"

function validDraft(message = "성공 건만 포함해 주세요.") {
  const draft = buildWorkCardDraft({
    originalText: message,
    naturalMeaning: "Please include only successful items.",
    politenessLevel: "존댓말 (polite)",
    mainPoint: "Count only successful items.",
    requiredAction: "Include only successful items.",
    conditions: ["Only successful items"],
    deadline: "",
    unknowns: [],
    messageRomanization: "seonggong geonman pohamhae juseyo.",
    recommendedReply: {
      korean: "네, 성공 건만 포함하겠습니다.",
      romanization: "ne, seonggong geonman pohamhagetseumnida.",
      english: "OK, I'll include only successful items.",
      register: "formal",
    },
    usefulLanguage: [
      { korean: "성공", english: "success", note: "" },
      { korean: "포함하다", english: "to include", note: "" },
      { korean: "~만", english: "only ~", note: "" },
    ],
  })
  const result = draftToCardContent(draft)
  if (!result.ok) throw new Error(result.errors.join(", "))
  return result
}

beforeEach(() => {
  db.kori_phrase_collections = []
  db.kori_phrase_cards = []
  currentUser = "user-a"
  migrationApplied = true
  insertCalls = 0
})

describe("phrasebookApi.saveWorkCapture", () => {
  it("creates the private collection once and saves one card with its work metadata", async () => {
    const { content, sourceKey } = validDraft()
    const { card, created } = await phrasebookApi.saveWorkCapture(content, sourceKey)

    expect(created).toBe(true)
    expect(db.kori_phrase_collections).toHaveLength(1)
    expect(db.kori_phrase_collections[0].source_key).toBe(WORK_CAPTURE_COLLECTION_KEY)
    expect(db.kori_phrase_cards).toHaveLength(1)
    expect(card.provenance).toBe("quoted")
    expect(card.workContext?.mainPoint).toBe("Count only successful items.")
    expect(card.vocabulary).toHaveLength(3)
    expect(card.isUserEdited).toBe(true)
  })

  it("saving the same draft twice (double click, retry) returns the first card", async () => {
    const { content, sourceKey } = validDraft()
    const first = await phrasebookApi.saveWorkCapture(content, sourceKey)
    const second = await phrasebookApi.saveWorkCapture(content, sourceKey)

    expect(second.created).toBe(false)
    expect(second.card.id).toBe(first.card.id)
    expect(db.kori_phrase_cards).toHaveLength(1)
    expect(db.kori_phrase_collections).toHaveLength(1)
  })

  it("concurrent saves end with one card — the loser reads the winner's row", async () => {
    const { content, sourceKey } = validDraft()
    const [a, b] = await Promise.all([
      phrasebookApi.saveWorkCapture(content, sourceKey),
      phrasebookApi.saveWorkCapture(content, sourceKey),
    ])
    expect(db.kori_phrase_cards).toHaveLength(1)
    expect(db.kori_phrase_collections).toHaveLength(1)
    expect(a.card.id).toBe(b.card.id)
    expect([a.created, b.created].sort()).toEqual([false, true])
  })

  it("a different reply is a different card", async () => {
    const one = validDraft()
    await phrasebookApi.saveWorkCapture(one.content, one.sourceKey)
    const other = validDraft("실패 건은 제외해 주세요.")
    await phrasebookApi.saveWorkCapture(other.content, other.sourceKey)
    expect(db.kori_phrase_cards).toHaveLength(2)
    expect(db.kori_phrase_collections).toHaveLength(1)
  })

  it("keeps users apart: another user's identical save creates their own rows", async () => {
    const { content, sourceKey } = validDraft()
    await phrasebookApi.saveWorkCapture(content, sourceKey)
    currentUser = "user-b"
    const { created } = await phrasebookApi.saveWorkCapture(content, sourceKey)
    expect(created).toBe(true)
    expect(db.kori_phrase_cards.map((r) => r.user_id).sort()).toEqual(["user-a", "user-b"])
    // Each card points at its own user's collection, never the other's.
    for (const card of db.kori_phrase_cards) {
      const collection = db.kori_phrase_collections.find((c) => c.id === card.collection_id)!
      expect(collection.user_id).toBe(card.user_id)
    }
  })

  it("rejects a key that isn't a capture key, and invalid content, before writing", async () => {
    const { content } = validDraft()
    await expect(phrasebookApi.saveWorkCapture(content, "workplace-current-work")).rejects.toThrow()
    await expect(
      phrasebookApi.saveWorkCapture({ ...content, answers: [] }, validDraft().sourceKey),
    ).rejects.toThrow()
    expect(insertCalls).toBe(0)
  })

  it("still saves before the migration, keeping the notes readable in the usage note", async () => {
    migrationApplied = false
    const { content, sourceKey } = validDraft()
    const { card, created } = await phrasebookApi.saveWorkCapture(content, sourceKey)
    expect(created).toBe(true)
    const stored = db.kori_phrase_cards[0]
    expect(stored).not.toHaveProperty("work_context")
    expect(String(stored.usage_note)).toContain("Main point: Count only successful items.")
    expect(card.workContext).toBeNull()
  })
})
