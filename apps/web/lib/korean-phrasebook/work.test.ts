import { describe, expect, it } from "vitest"

import {
  CAPTURED_MESSAGE_SITUATION,
  WORK_FOCUS_TAG,
  buildWorkCardDraft,
  captureSourceKey,
  detectSensitiveText,
  draftProvenance,
  draftToCardContent,
  isWorkMessageCard,
  registerFromFormality,
  replaceSensitive,
  type WorkAnalysisFields,
} from "./work"

// Synthetic, generic text only — nothing here is from a real workplace.
// The token-shaped string is assembled at runtime from obviously fake parts
// so no credential-looking literal lives in the repository.
const FAKE_JWT_LIKE = ["ey", "J", "x".repeat(8), ".", "y".repeat(8), ".", "z".repeat(8)].join("")

describe("detectSensitiveText", () => {
  it("finds links, emails, IPs, phone numbers, ticket IDs and tokens", () => {
    const text =
      "자세한 내용은 https://example.test/wiki 참고해 주세요. 문의: dev@example.test, " +
      "서버 10.0.0.12:8080, 연락처 010-1234-5678, 작업 ABC-1234, " +
      `토큰 ${FAKE_JWT_LIKE}`
    const kinds = detectSensitiveText(text).map((f) => f.kind)
    expect(kinds).toEqual(["url", "email", "ip", "phone", "ticket-id", "token"])
  })

  it("flags SQL as not auto-replaceable", () => {
    const [finding] = detectSensitiveText("조건은 select id from orders where status = 'OK' 입니다")
    expect(finding.kind).toBe("sql")
    expect(finding.replaceable).toBe(false)
  })

  it("reports a fragment once even when patterns overlap", () => {
    const findings = detectSensitiveText("http://10.0.0.12/admin 확인 부탁드립니다")
    expect(findings).toHaveLength(1)
    expect(findings[0].kind).toBe("url")
  })

  it("finds nothing in an ordinary work message", () => {
    expect(detectSensitiveText("확인 후 회신 부탁드립니다. 성공 건만 포함해 주세요.")).toEqual([])
  })
})

describe("replaceSensitive", () => {
  it("swaps replaceable fragments for placeholders and keeps the Korean", () => {
    const out = replaceSensitive("dev@example.test 로 보내 주시고 ABC-1234 확인 부탁드립니다")
    expect(out).toBe("[이메일] 로 보내 주시고 [작업번호] 확인 부탁드립니다")
  })

  it("replaces a token-shaped string", () => {
    expect(replaceSensitive(`키는 ${FAKE_JWT_LIKE} 입니다`)).toBe("키는 [토큰] 입니다")
  })

  it("leaves SQL for the learner to rewrite", () => {
    const sql = "select id from orders"
    expect(replaceSensitive(sql)).toBe(sql)
  })
})

describe("captureSourceKey", () => {
  it("is stable for the same message and reply, ignoring spacing and Unicode form", () => {
    const a = captureSourceKey("확인 부탁드립니다.", "네, 확인하겠습니다.")
    const b = captureSourceKey("  확인   부탁드립니다. ", "네, 확인하겠습니다.".normalize("NFD"))
    expect(a).toBe(b)
    expect(a).toMatch(/^capture-[0-9a-f]{16}$/)
  })

  it("differs when the reply differs", () => {
    expect(captureSourceKey("메시지", "답변 하나")).not.toBe(captureSourceKey("메시지", "답변 둘"))
  })

  it("can't be confused by moving text between message and reply", () => {
    expect(captureSourceKey("가나", "다")).not.toBe(captureSourceKey("가", "나다"))
  })
})

describe("registerFromFormality", () => {
  it("maps formal labels to formal and everything else to polite", () => {
    expect(registerFromFormality("격식체 (formal) — for managers")).toBe("formal")
    expect(registerFromFormality("formal")).toBe("formal")
    expect(registerFromFormality("존댓말 (polite)")).toBe("polite")
    // 반말 has no card register: a casual message is practiced politely.
    expect(registerFromFormality("반말 (casual)")).toBe("polite")
    expect(registerFromFormality(undefined)).toBe("polite")
  })
})

const ANALYSIS: WorkAnalysisFields = {
  originalText: "이 부분은 기존이랑 동일하게 처리해 주세요.",
  naturalMeaning: "Please handle this part the same way as before.",
  politenessLevel: "존댓말 (polite)",
  mainPoint: "Handle a part the same way as the existing behaviour.",
  requiredAction: "Handle “this part” like before.",
  conditions: [],
  deadline: "",
  expectedResult: "",
  unknowns: ["What “this part” refers to"],
  clarifyingQuestion: "이 부분이 어느 화면을 말씀하시는 건가요?",
  messageRomanization: "i bubuneun gijonirang dongilhage cheorihae juseyo.",
  recommendedReply: {
    korean: "네, 확인했습니다. 이 부분이 어느 화면인지 여쭤봐도 될까요?",
    romanization: "ne, hwaginhaetseumnida. i bubuni eoneu hwamyeoninji yeojjwobwado doelkkayo?",
    english: "Got it. May I ask which screen this part is?",
    register: "formal",
  },
  usefulLanguage: [
    { korean: "기존", english: "existing", note: "" },
    { korean: "동일하게", english: "the same way", note: "" },
    { korean: "~해 주세요", english: "please do ~", note: "" },
  ],
}

describe("buildWorkCardDraft", () => {
  it("keeps a missing deadline empty and the unknowns as unknowns", () => {
    const draft = buildWorkCardDraft(ANALYSIS)
    expect(draft.workContext.deadline).toBe("")
    expect(draft.workContext.unknowns).toEqual(["What “this part” refers to"])
    expect(draft.workContext.clarifyingQuestion).toContain("어느 화면")
  })

  it("uses the reply's register and the analyzed text unchanged", () => {
    const draft = buildWorkCardDraft(ANALYSIS, { sourceLabel: "team chat" })
    expect(draft.messageKorean).toBe(ANALYSIS.originalText)
    expect(draft.replyRegister).toBe("formal")
    expect(draft.messageRegister).toBe("polite")
    expect(draft.sourceLabel).toBe("team chat")
    expect(draft.usageNote).toContain("~해 주세요")
  })

  it("falls back to the natural meaning when an older result has no main point", () => {
    const draft = buildWorkCardDraft({ ...ANALYSIS, mainPoint: undefined })
    expect(draft.workContext.mainPoint).toBe(ANALYSIS.naturalMeaning)
  })
})

describe("draftProvenance", () => {
  it("is quoted when the message is unchanged (spacing aside) and paraphrased when edited", () => {
    const draft = buildWorkCardDraft(ANALYSIS)
    expect(draftProvenance(draft)).toBe("quoted")
    expect(draftProvenance({ ...draft, messageKorean: `  ${draft.messageKorean}  ` })).toBe(
      "quoted",
    )
    expect(
      draftProvenance({ ...draft, messageKorean: "이 부분은 기존과 같게 처리해 주세요." }),
    ).toBe("paraphrased")
  })
})

describe("draftToCardContent", () => {
  it("produces a valid work card with provenance, tag and a stable key", () => {
    const result = draftToCardContent(buildWorkCardDraft(ANALYSIS))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.content.situation).toBe(CAPTURED_MESSAGE_SITUATION)
    expect(result.content.tags).toContain(WORK_FOCUS_TAG)
    expect(result.content.provenance).toBe("quoted")
    expect(result.content.answers[0].isRecommended).toBe(true)
    expect(result.content.answers[0].usageNote).toMatch(/AI-suggested/)
    expect(result.sourceKey).toBe(
      captureSourceKey(ANALYSIS.originalText, ANALYSIS.recommendedReply!.korean),
    )
  })

  it("asks to shorten a message over 300 characters instead of cutting it", () => {
    const draft = { ...buildWorkCardDraft(ANALYSIS), messageKorean: "가".repeat(301) }
    const result = draftToCardContent(draft)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.join(" ")).toMatch(/Shorten the message/)
  })

  it("keeps romanization required, like every other card", () => {
    const draft = { ...buildWorkCardDraft(ANALYSIS), replyRomanization: "" }
    const result = draftToCardContent(draft)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toContain("Add romanization for the reply.")
  })
})

describe("isWorkMessageCard", () => {
  const context = buildWorkCardDraft(ANALYSIS).workContext
  it("needs both the work-focus tag and comprehension notes", () => {
    expect(isWorkMessageCard({ workContext: context, tags: [WORK_FOCUS_TAG] })).toBe(true)
    expect(isWorkMessageCard({ workContext: null, tags: [WORK_FOCUS_TAG] })).toBe(false)
    expect(isWorkMessageCard({ workContext: context, tags: ["standup"] })).toBe(false)
  })
})
