import { describe, expect, it } from "vitest"

import {
  activeFilterChips,
  clearAllFilters,
  hasAnyFilter,
  panelFilterCount,
  removeFilter,
  searchOptions,
} from "./filters"
import {
  SITUATION_LABELS,
  categoryLabel,
  difficultyLabel,
  humanizeKey,
  situationLabel,
} from "./labels"
import { filterPhraseCards } from "./mastery"
import type { PhraseCardWithProgress } from "@/lib/types"

describe("readable labels", () => {
  it("maps the stored keys called out in the brief", () => {
    expect(situationLabel("requirement-clarification")).toBe("Clarify requirements")
    expect(situationLabel("code-review-feedback")).toBe("Review feedback")
    expect(situationLabel("blocker-delay")).toBe("Report a blocker")
  })

  it("humanizes an unknown key instead of rendering it raw or blank", () => {
    expect(situationLabel("deploy-rollback")).toBe("Deploy rollback")
    expect(humanizeKey("some_key-name")).toBe("Some key name")
    expect(humanizeKey("")).toBe("")
  })

  it("never gives two different stored keys the same label (they'd look identical in the list)", () => {
    const labels = Object.values(SITUATION_LABELS)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it("labels categories and difficulties", () => {
    expect(categoryLabel("daily")).toBe("Daily life")
    expect(difficultyLabel("hard")).toBe("Hard")
  })
})

describe("filter helpers", () => {
  it("lists active filters as removable chips with labels, keeping the stored value", () => {
    const chips = activeFilterChips({
      query: "회의",
      category: "workplace",
      situation: "blocker-delay",
      difficulty: "easy",
    })
    expect(chips).toEqual([
      { dimension: "category", value: "workplace", label: "Workplace" },
      { dimension: "situation", value: "blocker-delay", label: "Report a blocker" },
      { dimension: "difficulty", value: "easy", label: "Easy" },
    ])
  })

  it("counts only the filters inside the panel", () => {
    expect(panelFilterCount({ category: "workplace" })).toBe(0)
    expect(panelFilterCount({ situation: "deadline", difficulty: "hard" })).toBe(2)
  })

  it("removes one filter without touching the rest, and clears everything", () => {
    const next = removeFilter(
      { situation: "deadline", difficulty: "hard", query: "x" },
      "situation",
    )
    expect(next).toEqual({ difficulty: "hard", query: "x" })
    expect(clearAllFilters()).toEqual({})
    expect(hasAnyFilter({})).toBe(false)
    expect(hasAnyFilter({ query: "  " })).toBe(false)
    expect(hasAnyFilter({ difficulty: "easy" })).toBe(true)
  })

  it("searches situations by label or stored key, sorted by label", () => {
    const options = ["blocker-delay", "requirement-clarification", "small-talk"]
    expect(searchOptions(options, "clarify", "situation")).toEqual(["requirement-clarification"])
    expect(searchOptions(options, "blocker-d", "situation")).toEqual(["blocker-delay"])
    expect(searchOptions(options, "", "situation")).toEqual([
      "requirement-clarification",
      "blocker-delay",
      "small-talk",
    ])
  })
})

describe("filterPhraseCards with stored keys", () => {
  const card = (situation: string, korean: string) =>
    ({
      id: korean,
      category: "workplace",
      situation,
      difficulty: "medium",
      question: { korean, romanization: "r", english: "e", register: "polite" },
      questionVariants: [],
      answers: [],
      tags: [],
      vocabulary: [],
      progress: null,
    }) as unknown as PhraseCardWithProgress

  const cards = [card("blocker-delay", "막혔어요"), card("small-talk", "주말 잘 보내셨어요?")]

  it("still filters by the stored key", () => {
    expect(filterPhraseCards(cards, { situation: "blocker-delay" })).toHaveLength(1)
  })

  it("finds cards by their readable situation label in search", () => {
    expect(filterPhraseCards(cards, { query: "report a blocker" }).map((c) => c.id)).toEqual([
      "막혔어요",
    ])
  })
})
