import { describe, expect, it } from "vitest"

import {
  countdownLabel,
  countdownTo,
  interviewScriptStorageKeys,
  parseStoredQueueIds,
  pickNewerScript,
  planTodayPractice,
  summarizeScript,
} from "./exam-prep-home"
import type { QuestionBankItem, QuestionProgress } from "./interview-practice"

// 2026-11-02 09:30 KST
const NOW = new Date("2026-11-02T00:30:00Z")

function question(id: string, overrides: Partial<QuestionBankItem> = {}): QuestionBankItem {
  return {
    id,
    questionKo: `질문 ${id}`,
    questionEn: null,
    sampleAnswerKo: null,
    sampleAnswerEn: null,
    category: "korean_summer",
    difficulty: "normal",
    priority: "recommended",
    keywords: [],
    displayOrder: Number(id.replace(/\D/g, "")) || 0,
    ownedByUser: false,
    ...overrides,
  }
}

function practiced(id: string, at: string): QuestionProgress {
  return {
    questionId: id,
    timesPracticed: 1,
    avgScore: 3,
    lastScore: 3,
    lastPracticedAt: at,
    status: "practicing",
  }
}

describe("countdownTo", () => {
  it("counts whole Seoul days to the exam", () => {
    expect(countdownTo("2026-11-28", NOW)).toEqual({ kind: "upcoming", days: 26 })
  })

  it("uses the Seoul day even when UTC is still on the previous date", () => {
    // 2026-11-27 15:30Z is 00:30 KST on Nov 28 — exam day in Seoul.
    expect(countdownTo("2026-11-28", new Date("2026-11-27T15:30:00Z"))).toEqual({
      kind: "today",
    })
  })

  it("reports a date that has passed", () => {
    expect(countdownTo("2026-11-20", new Date("2026-11-22T03:00:00Z"))).toEqual({
      kind: "past",
      daysAgo: 2,
    })
  })

  it("labels each case briefly", () => {
    expect(countdownLabel({ kind: "upcoming", days: 26 })).toBe("26 days left")
    expect(countdownLabel({ kind: "upcoming", days: 1 })).toBe("tomorrow")
    expect(countdownLabel({ kind: "today" })).toBe("today")
    expect(countdownLabel({ kind: "past", daysAgo: 3 })).toBe("passed")
  })
})

describe("parseStoredQueueIds", () => {
  it("reads the pinned id list", () => {
    expect(parseStoredQueueIds('["a","b"]')).toEqual(["a", "b"])
  })

  it.each([null, "", "not json", '{"a":1}', "[1, null]"])("returns no ids for %j", (raw) => {
    expect(parseStoredQueueIds(raw)).toEqual([])
  })
})

describe("planTodayPractice", () => {
  const questions = ["q1", "q2", "q3", "q4", "q5", "q6"].map((id) => question(id))
  const base = { questions, difficulty: "normal" as const, size: 5, now: NOW }

  it("previews five questions before the drill is started", () => {
    const plan = planTodayPractice({ ...base, progress: {}, storedIds: [] })
    expect(plan.status).toBe("not-started")
    expect(plan.total).toBe(5)
    expect(plan.done).toBe(0)
    expect(plan.next?.id).toBe(plan.queue[0].id)
  })

  it("keeps the pinned order and counts what was practiced today", () => {
    const storedIds = ["q3", "q1", "q2", "q4", "q5"]
    const plan = planTodayPractice({
      ...base,
      storedIds,
      progress: {
        q3: practiced("q3", "2026-11-02T00:05:00Z"), // today
        q1: practiced("q1", "2026-11-01T10:00:00Z"), // yesterday
      },
    })
    expect(plan.queue.map((q) => q.id)).toEqual(storedIds)
    expect(plan.status).toBe("in-progress")
    expect(plan.done).toBe(1)
    expect(plan.next?.id).toBe("q1")
  })

  it("doesn't count practice on questions that aren't pinned for today", () => {
    const plan = planTodayPractice({
      ...base,
      storedIds: [],
      progress: { q1: practiced("q1", "2026-11-02T00:05:00Z") },
    })
    expect(plan.done).toBe(0)
    expect(plan.status).toBe("not-started")
  })

  it("is done when every pinned question was practiced today", () => {
    const storedIds = ["q1", "q2", "q3", "q4", "q5"]
    const progress = Object.fromEntries(
      storedIds.map((id) => [id, practiced(id, "2026-11-02T00:10:00Z")]),
    )
    const plan = planTodayPractice({ ...base, storedIds, progress })
    expect(plan.status).toBe("done")
    expect(plan.done).toBe(5)
    expect(plan.next).toBeNull()
  })

  it("is empty when the bank has no questions", () => {
    const plan = planTodayPractice({ ...base, questions: [], progress: {}, storedIds: ["q1"] })
    expect(plan).toMatchObject({ status: "empty", total: 0, next: null })
  })
})

describe("pickNewerScript", () => {
  const local = { sections: { a: "local" }, updatedAt: "2026-11-01T10:00:00Z" }
  const remote = { sections: { a: "remote" }, updatedAt: "2026-11-01T09:00:00Z" }

  it("prefers whichever copy was saved last", () => {
    expect(pickNewerScript(local, remote)).toBe(local)
    expect(
      pickNewerScript(local, { ...remote, updatedAt: "2026-11-01T11:00:00Z" })?.sections.a,
    ).toBe("remote")
  })

  it("falls back to the copy that exists or has a valid time", () => {
    expect(pickNewerScript(null, remote)).toBe(remote)
    expect(pickNewerScript(local, null)).toBe(local)
    expect(pickNewerScript({ ...local, updatedAt: null }, remote)).toBe(remote)
    expect(pickNewerScript(null, null)).toBeNull()
  })
})

describe("interviewScriptStorageKeys", () => {
  it("matches the script editor's existing autosave keys", () => {
    expect(interviewScriptStorageKeys("weather")).toEqual({
      sections: "koriai-interview-script:weather",
      updatedAt: "koriai-interview-script:weather:updated-at",
    })
  })
})

describe("summarizeScript", () => {
  const topic = {
    scriptOutline: [
      { id: "intro", titleKo: "소개", titleEn: "Intro", hint: "" },
      { id: "body", titleKo: "본론", titleEn: "Body", hint: "" },
      { id: "end", titleKo: "마무리", titleEn: "End", hint: "" },
    ],
    scriptSeed: { intro: "안녕하세요 저는 헨리입니다", body: "", end: "감사합니다" },
  }

  it("counts the drafted script when nothing is saved", () => {
    expect(summarizeScript(topic, null)).toEqual({
      sectionsWritten: 2,
      totalSections: 3,
      words: 4,
      lastSavedAt: null,
      untouched: true,
    })
  })

  it("uses saved text, falls back to the draft for blank sections, and skips English keys", () => {
    const summary = summarizeScript(topic, {
      sections: { intro: "", body: "지하철을 탑니다", "en-body": "I take the subway every day" },
      updatedAt: "2026-11-01T10:00:00Z",
    })
    expect(summary.sectionsWritten).toBe(3)
    expect(summary.words).toBe(3 + 2 + 1)
    expect(summary.lastSavedAt).toBe("2026-11-01T10:00:00Z")
    expect(summary.untouched).toBe(false)
  })

  it("treats a saved copy identical to the draft as untouched", () => {
    const summary = summarizeScript(topic, {
      sections: { intro: "안녕하세요 저는 헨리입니다", end: "감사합니다" },
      updatedAt: "2026-11-01T10:00:00Z",
    })
    expect(summary.untouched).toBe(true)
  })
})
