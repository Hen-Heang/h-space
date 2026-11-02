import { describe, expect, it } from "vitest"

import { buildVoicePracticePrompt, CHATGPT_URL } from "./chatgpt-voice"

const topic = {
  labelKo: "한국에 온 후 새로 생긴 습관/취미",
  label: "New habits and hobbies",
  examinerBrief: "1) Why they chose the topic.\n2) Transportation.",
}

describe("buildVoicePracticePrompt", () => {
  it("sets up a Korean-only examiner with the topic and question plan", () => {
    const prompt = buildVoicePracticePrompt({ topic, style: "practice" })
    expect(prompt).toContain("Speak only Korean")
    expect(prompt).toContain("ONE short question at a time")
    expect(prompt).toContain(topic.labelKo)
    expect(prompt).toContain("2) Transportation.")
    expect(prompt).toContain("one short tip in English")
  })

  it("holds feedback until the end in exam style", () => {
    const prompt = buildVoicePracticePrompt({ topic, style: "exam" })
    expect(prompt).toContain('no feedback until I say "끝"')
    expect(prompt).not.toContain("one short tip in English")
  })

  it("doesn't ask for a pronunciation score it can't honestly give", () => {
    const prompt = buildVoicePracticePrompt({ topic, style: "practice" })
    expect(prompt).toContain("Don't give me a pronunciation score")
  })

  it("includes the script only when one is passed (opt-in)", () => {
    expect(buildVoicePracticePrompt({ topic, style: "practice" })).not.toContain(
      "My prepared script",
    )
    expect(buildVoicePracticePrompt({ topic, style: "practice", script: [] })).not.toContain(
      "My prepared script",
    )
    const withScript = buildVoicePracticePrompt({
      topic,
      style: "practice",
      script: [{ id: "intro", title: "0. 소개", text: "안녕하세요. 저는 헨리입니다." }],
    })
    expect(withScript).toContain("My prepared script")
    expect(withScript).toContain("0. 소개\n안녕하세요. 저는 헨리입니다.")
  })

  it("links to ChatGPT over HTTPS", () => {
    expect(CHATGPT_URL).toBe("https://chatgpt.com/")
  })
})
