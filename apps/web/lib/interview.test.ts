import { describe, expect, it } from "vitest"

import {
  buildAnswerMessage,
  buildEvaluationPrompt,
  buildInterviewSystemPrompt,
  buildScriptDocument,
  getInterviewTopic,
  INTERVIEW_TOPICS,
  parseEvaluation,
  parseExaminerTurn,
  toEvaluationScores,
} from "./interview"
import { INTERVIEW_MODES } from "./interview-modes"
import { sampleUnexpectedQuestions } from "./interview-unexpected"

describe("getInterviewTopic", () => {
  it("returns the matching topic", () => {
    expect(getInterviewTopic("weather").id).toBe("weather")
  })

  it("falls back to the first topic for an unknown id", () => {
    expect(getInterviewTopic("nope").id).toBe(INTERVIEW_TOPICS[0].id)
  })

  it("offers the weather topic first, as the default/recommended one", () => {
    expect(INTERVIEW_TOPICS.length).toBeGreaterThanOrEqual(1)
    expect(INTERVIEW_TOPICS[0].id).toBe("weather")
  })
})

describe("current exam topic prep (habits & hobbies)", () => {
  it("ships curated vocabulary, phrases, and sample questions", () => {
    const weather = getInterviewTopic("weather")
    expect(weather.recommended).toBe(true)
    expect(weather.prep).toBeDefined()
    expect(weather.prep!.vocabulary.length).toBeGreaterThanOrEqual(15)
    expect(weather.prep!.keyPhrases.length).toBeGreaterThan(0)
    expect(weather.prep!.sampleQuestions.length).toBeGreaterThan(0)
    // Every phrase/question carries both Korean and English.
    for (const entry of [...weather.prep!.keyPhrases, ...weather.prep!.sampleQuestions]) {
      expect(entry.ko.trim()).not.toBe("")
      expect(entry.en.trim()).not.toBe("")
    }
  })

  it("includes a pass-first vocabulary deck with contextual examples", () => {
    const prep = getInterviewTopic("weather").prep!
    const core = prep.vocabulary.filter((entry) => entry.priority === "core")
    const stretch = prep.vocabulary.filter((entry) => entry.priority === "stretch")

    expect(core.length).toBeGreaterThanOrEqual(15)
    expect(stretch.length).toBeGreaterThan(0)
    for (const entry of core) {
      expect(entry.exampleKo?.trim()).not.toBe("")
      expect(entry.exampleEn?.trim()).not.toBe("")
    }
  })

  it("ships reusable speaking frames and model answers for the core questions", () => {
    const prep = getInterviewTopic("weather").prep!
    const modelQuestions = prep.sampleQuestions.filter((question) => question.answerKo)

    expect(prep.answerFrames?.length).toBeGreaterThanOrEqual(5)
    expect(modelQuestions.length).toBeGreaterThanOrEqual(10)
    for (const question of modelQuestions) {
      expect(question.answerEn?.trim()).not.toBe("")
      expect(question.keywords?.length).toBeGreaterThanOrEqual(3)
    }
  })

  it("cites a Korean-language reference", () => {
    const sources = getInterviewTopic("weather").prep!.sources ?? []
    const publishers = sources.map((source) => source.publisher).join(" ")

    expect(publishers).toContain("국립국어원")
  })
})

describe("current exam topic script outline", () => {
  it("ships an ordered script outline", () => {
    const outline = getInterviewTopic("weather").scriptOutline
    expect(outline).toBeDefined()
    expect(outline!.length).toBeGreaterThanOrEqual(5)
    expect(outline![0].id).toBe("self-intro")
    expect(outline![1].id).toBe("opening")
  })

  it("seeds every outline section in Korean and English", () => {
    const topic = getInterviewTopic("weather")
    for (const section of topic.scriptOutline!) {
      expect(topic.scriptSeed?.[section.id]?.trim()).toBeTruthy()
      expect(topic.scriptSeedEn?.[section.id]?.trim()).toBeTruthy()
    }
  })
})

describe("buildScriptDocument", () => {
  const weather = getInterviewTopic("weather")

  it("assembles filled sections with headings and skips empties", () => {
    const doc = buildScriptDocument(weather, {
      opening: "안녕하세요. 저는 헨입니다.",
      transport: "한국에서는 매일 걸어서 출근해요.",
      "weather-check": "   ", // whitespace-only is skipped
    })
    expect(doc).toContain(weather.labelKo)
    expect(doc).toContain("주제 소개")
    expect(doc).toContain("안녕하세요. 저는 헨입니다.")
    expect(doc).toContain("한국에서는 매일 걸어서 출근해요.")
    expect(doc).not.toContain("날씨 확인 습관")
  })

  it("returns just the title when nothing is written", () => {
    expect(buildScriptDocument(weather, {})).toBe(weather.labelKo)
  })
})

describe("buildInterviewSystemPrompt", () => {
  it("embeds the topic and the response-format tags (practice default)", () => {
    const prompt = buildInterviewSystemPrompt(getInterviewTopic("weather"))
    expect(prompt).toContain("한국에 온 후 새로 생긴 습관/취미")
    expect(prompt).toContain("[QUESTION_KO]")
    expect(prompt).toContain("[QUESTION_EN]")
    expect(prompt).toContain("[FEEDBACK]")
  })

  it("always demands follow-up probing before advancing", () => {
    const prompt = buildInterviewSystemPrompt(getInterviewTopic("weather"))
    expect(prompt).toContain("NEVER move to a new sub-topic after only one question")
    expect(prompt).toContain("왜 그렇게 생각합니까?")
    expect(prompt).toContain("예를 들어 설명해 주세요")
  })

  it("exam mode is Korean-only: no feedback or English tags requested", () => {
    const prompt = buildInterviewSystemPrompt(getInterviewTopic("weather"), INTERVIEW_MODES.exam)
    expect(prompt).toContain("[QUESTION_KO]")
    expect(prompt).not.toContain("[QUESTION_EN]")
    expect(prompt).not.toContain("[FEEDBACK]")
    expect(prompt).toContain("Do NOT include feedback, English, or translations")
    expect(prompt).toContain("Give no feedback during the interview")
  })

  it("lists sampled unexpected questions when provided", () => {
    const sampled = sampleUnexpectedQuestions(3, () => 0.42)
    const prompt = buildInterviewSystemPrompt(
      getInterviewTopic("weather"),
      INTERVIEW_MODES.exam,
      sampled,
    )
    expect(prompt).toContain("unexpected everyday interview question")
    for (const q of sampled) {
      expect(prompt).toContain(q.ko)
    }
  })

  it("omits the unexpected block when no questions are passed", () => {
    const prompt = buildInterviewSystemPrompt(getInterviewTopic("weather"))
    expect(prompt).not.toContain("unexpected everyday interview question")
  })
})

describe("parseExaminerTurn", () => {
  it("splits a well-formed reply into sections", () => {
    const raw = [
      "[FEEDBACK]",
      "Good vocabulary, but try to speak with more confidence.",
      "[QUESTION_KO]",
      "한국 여름 날씨는 어때요?",
      "[QUESTION_EN]",
      "How is the summer weather in Korea?",
    ].join("\n")

    const turn = parseExaminerTurn(raw)
    expect(turn.feedback).toBe("Good vocabulary, but try to speak with more confidence.")
    expect(turn.questionKo).toBe("한국 여름 날씨는 어때요?")
    expect(turn.questionEn).toBe("How is the summer weather in Korea?")
  })

  it("handles a missing feedback section", () => {
    const raw = "[QUESTION_KO]\n안녕하세요?\n[QUESTION_EN]\nHello?"
    const turn = parseExaminerTurn(raw)
    expect(turn.feedback).toBe("")
    expect(turn.questionKo).toBe("안녕하세요?")
    expect(turn.questionEn).toBe("Hello?")
  })

  it("falls back to treating unformatted text as the question", () => {
    const turn = parseExaminerTurn("한국 음식을 좋아하세요?")
    expect(turn.questionKo).toBe("한국 음식을 좋아하세요?")
    expect(turn.feedback).toBe("")
    expect(turn.questionEn).toBe("")
  })
})

describe("buildAnswerMessage", () => {
  it("wraps the answer and keeps the examiner on-format", () => {
    const message = buildAnswerMessage("  저는 더위를 안 좋아해요  ")
    expect(message).toContain("저는 더위를 안 좋아해요")
    expect(message).toContain("required format")
  })

  it("exam mode reminds the examiner: no feedback, no English", () => {
    const message = buildAnswerMessage("네, 좋아요", INTERVIEW_MODES.exam)
    expect(message).toContain("No feedback, no English")
    expect(message).not.toContain("Give brief feedback")
  })
})

describe("parseExaminerTurn (exam-mode replies)", () => {
  it("parses a KO-only reply with empty feedback and English", () => {
    const turn = parseExaminerTurn("[QUESTION_KO]\n한국 생활은 어떻습니까?")
    expect(turn.questionKo).toBe("한국 생활은 어떻습니까?")
    expect(turn.feedback).toBe("")
    expect(turn.questionEn).toBe("")
  })
})

describe("toEvaluationScores", () => {
  it("maps keyed scores into the official criteria order", () => {
    const scores = toEvaluationScores({
      speaking: 4,
      pronunciation: 3,
      vocabulary: 5,
      confidence: 2,
    })
    expect(scores.map((s) => s.label)).toEqual([
      "Speaking",
      "Pronunciation",
      "Vocabulary",
      "Confidence",
    ])
    expect(scores[0]).toEqual({ label: "Speaking", score: 4, max: 5 })
    expect(scores[3]).toEqual({ label: "Confidence", score: 2, max: 5 })
  })

  it("clamps and rounds out-of-range values", () => {
    const scores = toEvaluationScores({
      speaking: 7,
      pronunciation: 0,
      vocabulary: 3.6,
      confidence: -1,
    })
    expect(scores[0].score).toBe(5)
    expect(scores[1].score).toBe(1)
    expect(scores[2].score).toBe(4)
    expect(scores[3].score).toBe(1)
  })
})

describe("buildEvaluationPrompt", () => {
  it("ends the interview and asks for the four criteria as scores", () => {
    const prompt = buildEvaluationPrompt()
    expect(prompt).toContain("[SCORES]")
    expect(prompt).toContain("Speaking")
    expect(prompt).toContain("Pronunciation")
    expect(prompt).toContain("Vocabulary")
    expect(prompt).toContain("Confidence")
    expect(prompt).toContain("Do NOT ask another question")
  })
})

describe("parseEvaluation", () => {
  it("parses a well-formed scorecard", () => {
    const raw = [
      "[SCORES]",
      "Speaking: 4/5",
      "Pronunciation: 3/5",
      "Vocabulary: 4/5",
      "Confidence: 5/5",
      "[SUMMARY]",
      "Strong vocabulary and good confidence; pronunciation needs polish.",
      "[ADVICE]",
      "- Slow down on long sentences.",
      "- Practice the 장마 vocabulary out loud.",
    ].join("\n")

    const result = parseEvaluation(raw)
    expect(result.scores).toHaveLength(4)
    expect(result.scores[0]).toEqual({ label: "Speaking", score: 4, max: 5 })
    expect(result.scores[3]).toEqual({ label: "Confidence", score: 5, max: 5 })
    expect(result.summary).toContain("Strong vocabulary")
    expect(result.advice).toHaveLength(2)
    expect(result.advice[0]).toBe("Slow down on long sentences.")
  })

  it("accepts bare numbers without /5 and clamps out-of-range scores", () => {
    const raw = "[SCORES]\nSpeaking: 4\nPronunciation: 9\n[SUMMARY]\nGood.\n[ADVICE]\n• Keep going."
    const result = parseEvaluation(raw)
    expect(result.scores[0]).toEqual({ label: "Speaking", score: 4, max: 5 })
    // 9 is clamped to the max of 5.
    expect(result.scores[1]).toEqual({ label: "Pronunciation", score: 5, max: 5 })
    expect(result.advice[0]).toBe("Keep going.")
  })

  it("tolerates a missing scores block", () => {
    const result = parseEvaluation("[SUMMARY]\nNice work overall.\n[ADVICE]\n1. Review grammar.")
    expect(result.scores).toHaveLength(0)
    expect(result.summary).toBe("Nice work overall.")
    expect(result.advice[0]).toBe("Review grammar.")
  })
})
