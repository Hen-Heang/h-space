import { describe, expect, it } from "vitest"

import { INTERVIEW_TOPICS } from "./interview"
import {
  compareRepeat,
  REPEAT_GRADE_LABELS,
  phrasesToRepeatSentences,
  scriptToRepeatSentences,
  splitIntoSentences,
} from "./repeat-drill"

describe("splitIntoSentences", () => {
  it("splits on sentence-ending punctuation and newlines", () => {
    const text = "안녕하세요. 저는 헨리입니다.\n오늘은 날씨에 대해 이야기하겠습니다."
    expect(splitIntoSentences(text)).toEqual([
      "안녕하세요.",
      "저는 헨리입니다.",
      "오늘은 날씨에 대해 이야기하겠습니다.",
    ])
  })

  it("drops empty and too-short fragments", () => {
    expect(splitIntoSentences("네. \n\n  ")).toEqual([])
    expect(splitIntoSentences("")).toEqual([])
  })
})

describe("scriptToRepeatSentences", () => {
  const topic = INTERVIEW_TOPICS[0]

  it("uses the seed draft when no saved script exists", () => {
    const sentences = scriptToRepeatSentences(topic, null)
    expect(sentences.length).toBeGreaterThan(5)
    expect(sentences[0].sourceLabel).toBe(topic.scriptOutline![0].titleKo)
  })

  it("prefers saved section text over the seed", () => {
    const firstSection = topic.scriptOutline![0].id
    const sentences = scriptToRepeatSentences(topic, {
      [firstSection]: "제가 직접 쓴 문장입니다.",
    })
    expect(sentences[0].ko).toBe("제가 직접 쓴 문장입니다.")
    // Other sections still fall back to the seed.
    expect(sentences.length).toBeGreaterThan(1)
  })
})

describe("phrasesToRepeatSentences", () => {
  it("maps phrases with their gloss", () => {
    const sentences = phrasesToRepeatSentences([
      { ko: "질문 감사합니다.", en: "Thank you for the question." },
    ])
    expect(sentences).toHaveLength(1)
    expect(sentences[0].en).toBe("Thank you for the question.")
  })
})

describe("compareRepeat", () => {
  it("grades an exact repeat as perfect with all words hit", () => {
    const result = compareRepeat("저는 물을 많이 마십니다.", "저는 물을 많이 마십니다")
    expect(result.grade).toBe("perfect")
    expect(result.wordAccuracy).toBe(100)
    expect(result.marks.every((m) => m.hit)).toBe(true)
  })

  it("ignores punctuation differences", () => {
    const result = compareRepeat("들어 주셔서 감사합니다.", "들어 주셔서 감사합니다!")
    expect(result.grade).toBe("perfect")
  })

  it("marks a missed word", () => {
    const result = compareRepeat("한국의 여름은 덥고 습합니다.", "한국의 여름은 습합니다")
    const missed = result.marks.filter((m) => !m.hit).map((m) => m.word)
    expect(missed).toEqual(["덥고"])
    expect(result.wordAccuracy).toBeLessThan(100)
  })

  it("tolerates STT spacing merges", () => {
    // Target has a space the recognizer often drops.
    const result = compareRepeat("잘 못 잘 때도 있습니다.", "잘못 잘 때도 있습니다")
    expect(result.similarity).toBeGreaterThanOrEqual(90)
    expect(result.marks.every((m) => m.hit)).toBe(true)
  })

  it("grades an unrelated sentence as retry", () => {
    const result = compareRepeat("한국의 여름은 덥습니다.", "저는 캄보디아 사람입니다")
    expect(result.grade).toBe("retry")
  })

  it("grades an empty repeat as retry with zero scores", () => {
    const result = compareRepeat("안녕하세요.", "")
    expect(result.grade).toBe("retry")
    expect(result.wordAccuracy).toBe(0)
    expect(result.similarity).toBe(0)
  })

  it("does not reward shuffled word order with a perfect score", () => {
    const target = "저는 오늘 학교에 갑니다."
    const shuffled = "갑니다 학교에 오늘 저는"
    const result = compareRepeat(target, shuffled)
    expect(result.similarity).toBeLessThan(90)
  })
})

describe("REPEAT_GRADE_LABELS", () => {
  it("describes a transcript match, never a pronunciation verdict", () => {
    for (const label of Object.values(REPEAT_GRADE_LABELS)) {
      expect(label.toLowerCase()).not.toMatch(/perfect|pronunciation|완벽/)
    }
  })
})
