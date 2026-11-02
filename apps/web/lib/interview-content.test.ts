import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { getInterviewTopic, getSeedQA } from "./interview"
import { PERSONAL_EXAM_QA } from "./personal-exam-prep"
import {
  selectTodaysQueue,
  versionsToDeactivate,
  type QuestionBankItem,
} from "./interview-practice"

// Two sections of the 제6회 final script (Notion FINAL INTERVIEW SCRIPT), pinned
// so the Korean seed and its English translation stay in step.
const TRANSPORT_KO =
  "캄보디아에서는 밖에 갈 때 보통 오토바이나 차를 이용했습니다. 하지만 한국에서는 걸어서 출근하고, 멀리 갈 때는 버스나 지하철을 이용합니다.\n\n저는 지하철 5호선을 자주 이용합니다. 처음에는 지하철 노선과 환승이 어려웠지만, 지금은 혼자서도 서울의 여러 곳에 갈 수 있습니다."
const EXERCISE_EN_MARKERS = ["Yeouido Park", "Han River", "refreshed"]

// A sentence ending in informal-polite -요 ("…해요.", "…이에요?"). The final
// script and the model answers use formal -습니다 style throughout.
const HAEYO_SENTENCE_END = /요[.?!]/

const focusedSeedPath = new URL(
  "../supabase/seed/kori_interview_questions_cambodia_experience.sql",
  import.meta.url,
)
const baseSeedPath = new URL("../supabase/seed/kori_interview_questions.sql", import.meta.url)
const focusedSeed = readFileSync(focusedSeedPath, "utf8")
const baseSeed = readFileSync(baseSeedPath, "utf8")
const expectedSlugs = [
  "weather-cambodia-hot-place",
  "weather-cambodia-why-seaside",
  "weather-cambodia-seaside-activities",
  "weather-cambodia-seaside-memory",
  "weather-korea-cambodia-summer-activities",
  "weather-cambodia-new-year",
  "weather-korea-hot-day-drink",
  "weather-cambodia-hot-day-drink",
  "weather-summer-drink-difference",
  "weather-rain-pattern-difference",
  "weather-umbrella-or-shade",
  "weather-han-river-cycling",
  "weather-why-evening-cycling",
  "weather-yeongjongdo-plan",
  "weather-summer-lesson",
]
// The TOP 5 questions from the prep dashboard — each must ship offline with a
// model answer.
const top5QuestionKo = [
  "왜 이 주제를 선택했어요?",
  "한국에 온 후 새로 생긴 습관은 뭐예요?",
  "왜 산책을 자주 하게 되었어요?",
  "주말에는 보통 뭐 해요?",
  "한국어 공부는 어떻게 하고 있어요?",
]

function weatherSlugs(sql: string): string[] {
  return [...sql.matchAll(/\(?\s*'(weather-[a-z0-9-]+)'\s*,/g)].map((match) => match[1])
}

function seedQuestion(
  slug: string,
  displayOrder: number,
  difficulty: QuestionBankItem["difficulty"],
  priority: QuestionBankItem["priority"],
): QuestionBankItem {
  return {
    id: slug,
    questionKo: slug,
    questionEn: slug,
    sampleAnswerKo: null,
    sampleAnswerEn: null,
    category: slug === expectedSlugs.at(-1) ? "comparison" : "personal_experience",
    difficulty,
    priority,
    keywords: [],
    displayOrder,
    ownedByUser: false,
  }
}

describe("current exam script content (habits & hobbies)", () => {
  const weather = getInterviewTopic("weather")

  it("keeps the canonical Korean transport section and its English translation", () => {
    expect(weather.scriptSeed?.transport).toBe(TRANSPORT_KO)
    expect(weather.scriptSeedEn?.transport).toContain("motorbike")
    expect(weather.scriptSeedEn?.transport).toContain("subway")
  })

  it("contains the real exercise story in Korean and English", () => {
    expect(weather.scriptSeed?.exercise).toContain("여의도공원")
    expect(weather.scriptSeed?.exercise).toContain("한강")
    for (const marker of EXERCISE_EN_MARKERS) {
      expect(weather.scriptSeedEn?.exercise).toContain(marker)
    }
  })

  it("writes the script and model answers in formal -습니다 style", () => {
    for (const [id, text] of Object.entries(weather.scriptSeed ?? {})) {
      expect({ id, informal: HAEYO_SENTENCE_END.test(text) }).toEqual({ id, informal: false })
    }
    for (const question of weather.prep?.sampleQuestions ?? []) {
      const answer = question.answerKo ?? ""
      expect({ q: question.ko, informal: HAEYO_SENTENCE_END.test(answer) }).toEqual({
        q: question.ko,
        informal: false,
      })
    }
    for (const item of PERSONAL_EXAM_QA) {
      expect({ id: item.id, informal: HAEYO_SENTENCE_END.test(item.answer) }).toEqual({
        id: item.id,
        informal: false,
      })
    }
  })

  it("keeps the home station out of the public script", () => {
    const allText = Object.values(weather.scriptSeed ?? {}).join(" ")
    expect(allText).not.toContain("영등포")
  })

  it("retains every canonical section in both languages", () => {
    const sectionIds = weather.scriptOutline?.map((section) => section.id) ?? []
    expect(Object.keys(weather.scriptSeed ?? {})).toEqual(sectionIds)
    expect(Object.keys(weather.scriptSeedEn ?? {})).toEqual(sectionIds)
    for (const id of sectionIds) {
      expect(weather.scriptSeed?.[id]?.trim()).not.toBe("")
      expect(weather.scriptSeedEn?.[id]?.trim()).not.toBe("")
    }
  })

  it("keeps the TOP 5 questions available to the page offline with model answers", () => {
    const offlineQA = getSeedQA(weather)
    const prepQuestions = weather.prep?.sampleQuestions ?? []

    for (const questionKo of top5QuestionKo) {
      expect(offlineQA.some((question) => question.questionKo === questionKo)).toBe(true)
      const model = prepQuestions.find((question) => question.ko === questionKo)
      expect(model?.answerKo?.trim()).toBeTruthy()
      expect(model?.answerEn?.trim()).toBeTruthy()
      expect(model?.keywords?.length).toBeGreaterThan(0)
    }
  })
})

describe("script-aligned weather question seed", () => {
  it("has fifteen conflict-safe slugs that do not duplicate the base seed", () => {
    const focusedSlugs = weatherSlugs(focusedSeed)
    const allSlugs = [...weatherSlugs(baseSeed), ...focusedSlugs]
    expect(focusedSlugs).toEqual(expectedSlugs)
    expect(new Set(allSlugs).size).toBe(allSlugs.length)
    expect(focusedSeed).toContain("on conflict (slug) do nothing")
  })

  it("uses allowed categories, difficulties, and priorities", () => {
    expect(focusedSeed.match(/'personal_experience'/g)).toHaveLength(9)
    expect(focusedSeed.match(/'comparison'/g)).toHaveLength(4)
    expect(focusedSeed.match(/'cambodian_weather'/g)).toHaveLength(1)
    expect(focusedSeed.match(/'adaptation'/g)).toHaveLength(1)
    expect(focusedSeed.match(/'beginner'/g)).toHaveLength(7)
    expect(focusedSeed.match(/'normal'/g)).toHaveLength(5)
    expect(focusedSeed.match(/'challenging'/g)).toHaveLength(3)
    expect(focusedSeed.match(/'must_practice'/g)).toHaveLength(6)
    expect(focusedSeed.match(/'recommended'/g)).toHaveLength(9)
  })

  it("covers every fact newly introduced by the revised script", () => {
    for (const detail of [
      "캄보디아 새해",
      "Cambodian New Year",
      "수박 주스",
      "watermelon juice",
      "코코넛 커피",
      "coconut coffee",
      "갑자기 많이 내렸다가 빨리 그칠",
      "rains heavily and suddenly and then stops quickly",
      "그늘",
      "shade",
      "한강에서 자전거",
      "bicycle along the Han River",
      "영종도",
      "Yeongjongdo",
    ]) {
      expect(focusedSeed).toContain(detail)
    }
  })

  it("allows every new record to participate in the daily mixed queue", () => {
    const questions = expectedSlugs.map((slug, index) =>
      seedQuestion(
        slug,
        51 + index,
        index % 3 === 0 ? "beginner" : index % 3 === 1 ? "normal" : "challenging",
        index % 2 === 0 ? "must_practice" : "recommended",
      ),
    )
    const queue = selectTodaysQueue(questions, {}, "mixed", questions.length)
    expect(queue).toHaveLength(expectedSlugs.length)
    expect(new Set(queue.map((question) => question.id))).toEqual(new Set(expectedSlugs))
  })

  it("keeps activation helpers able to leave one selected version active", () => {
    expect(
      versionsToDeactivate(
        [
          { id: "previous-active", isActive: true },
          { id: "older-inactive", isActive: false },
          { id: "exam-week", isActive: false },
        ],
        "exam-week",
      ),
    ).toEqual(["previous-active"])
  })
})

describe("habits question bank migration", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261102130000_habits_question_bank.sql", import.meta.url),
    "utf8",
  )
  const sqlText = (value: string) => `'${value.replace(/'/g, "''")}'`
  // The questions that carry a model answer. The answerless universal
  // follow-ups ("왜요?", …) are listening practice and stay out of the bank.
  const modelQuestions = (getInterviewTopic("weather").prep?.sampleQuestions ?? []).filter(
    (question) => (question.answerKo ?? "").trim() !== "",
  )

  it("ships every model question and its formal answer, in the code's order", () => {
    expect(modelQuestions).toHaveLength(21)
    let cursor = 0
    for (const question of modelQuestions) {
      const at = migration.indexOf(sqlText(question.ko), cursor)
      expect({ question: question.ko, found: at >= 0 }).toEqual({
        question: question.ko,
        found: true,
      })
      expect(migration).toContain(sqlText(question.answerKo ?? ""))
      expect(migration).toContain(sqlText(question.answerEn ?? ""))
      cursor = at
    }
  })

  it("uses unique habits slugs and only deactivates shared questions", () => {
    const slugs = [...migration.matchAll(/'(habits-[a-z0-9-]+)', 'weather'/g)].map((m) => m[1])
    expect(slugs).toHaveLength(21)
    expect(new Set(slugs).size).toBe(21)
    expect(migration).toMatch(/set active = false[\s\S]*created_by_user_id is null/)
    expect(migration).not.toMatch(/delete from/i)
    expect(migration).toContain("on conflict (slug) do update")
  })

  it("marks the TOP 5 questions must_practice", () => {
    for (const questionKo of top5QuestionKo) {
      const start = migration.indexOf(sqlText(questionKo))
      const row = migration.slice(start, migration.indexOf("  )", start))
      expect({ questionKo, mustPractice: row.includes("'must_practice'") }).toEqual({
        questionKo,
        mustPractice: true,
      })
    }
  })
})
