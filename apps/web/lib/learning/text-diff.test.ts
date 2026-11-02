import { describe, expect, it } from "vitest"

import { changedRatio, diffText } from "./text-diff"

describe("diffText", () => {
  it("returns one unchanged segment for identical text", () => {
    expect(diffText("안녕하세요", "안녕하세요")).toEqual([{ type: "same", text: "안녕하세요" }])
  })

  it("marks a substituted particle as removed then added", () => {
    expect(diffText("저는 학생를 좋아해요", "저는 학생을 좋아해요")).toEqual([
      { type: "same", text: "저는 학생" },
      { type: "removed", text: "를" },
      { type: "added", text: "을" },
      { type: "same", text: " 좋아해요" },
    ])
  })

  it("handles pure insertions and deletions", () => {
    expect(diffText("회의 있어요", "회의가 있어요")).toEqual([
      { type: "same", text: "회의" },
      { type: "added", text: "가" },
      { type: "same", text: " 있어요" },
    ])
    expect(diffText("오늘 정말 바빠요", "오늘 바빠요")).toEqual([
      { type: "same", text: "오늘 " },
      { type: "removed", text: "정말 " },
      { type: "same", text: "바빠요" },
    ])
  })

  it("handles empty input on either side", () => {
    expect(diffText("", "네")).toEqual([{ type: "added", text: "네" }])
    expect(diffText("네", "")).toEqual([{ type: "removed", text: "네" }])
    expect(diffText("", "")).toEqual([])
  })

  it("rebuilds both sentences from its segments", () => {
    const before = "마감일 언제 있어요?"
    const after = "마감일이 언제예요?"
    const segments = diffText(before, after)!
    const rebuild = (skip: "added" | "removed") =>
      segments
        .filter((s) => s.type !== skip)
        .map((s) => s.text)
        .join("")
    expect(rebuild("added")).toBe(before)
    expect(rebuild("removed")).toBe(after)
  })

  it("refuses inputs too long to diff interactively", () => {
    expect(diffText("가".repeat(600), "나".repeat(600))).toBeNull()
  })
})

describe("changedRatio", () => {
  it("is 0 for no change and 1 for a full rewrite", () => {
    expect(changedRatio(diffText("네", "네")!)).toBe(0)
    expect(changedRatio(diffText("가나", "다라")!)).toBe(1)
  })

  it("is small for a one-particle fix", () => {
    expect(changedRatio(diffText("저는 학생를 좋아해요", "저는 학생을 좋아해요")!)).toBeLessThan(
      0.2,
    )
  })
})
