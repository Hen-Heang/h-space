import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { CorrectionRetryPanel, PRONUNCIATION_DISCLAIMER } from "./CorrectionRetryPanel"

const result = {
  scores: {
    speaking: 2,
    grammar: 2,
    vocabulary: 2,
    pronunciation: 2,
    confidence: 3,
    naturalness: 2,
  },
  feedback: "Use a complete sentence.",
  correctedAnswer: "??? ??? ?? ????.",
  betterAlternative: "??? ??? ?? ??? ?? ????.",
  tip: "Pause once between the two sentences.",
}

describe("CorrectionRetryPanel", () => {
  it("keeps the pronunciation limitation visible beside transcript scores", () => {
    const html = renderToStaticMarkup(
      <CorrectionRetryPanel
        questionId="q1"
        firstAnswer="?? ?? ???"
        firstResult={result}
        onRetry={() => undefined}
        onNext={() => undefined}
        isLast={false}
      />,
    )
    expect(html).toContain(PRONUNCIATION_DISCLAIMER)
    expect(html).toContain("Retry Answer")
  })

  it("highlights what changed between the answer and its correction", () => {
    const html = renderToStaticMarkup(
      <CorrectionRetryPanel
        questionId="q1"
        firstAnswer="저는 학생를 좋아해요"
        firstResult={{ ...result, correctedAnswer: "저는 학생을 좋아해요" }}
        onRetry={() => undefined}
        onNext={() => undefined}
        isLast={false}
      />,
    )
    expect(html).toContain("What changed")
    expect(html).toContain("<del")
    expect(html).toContain("<ins")
  })

  it("skips the highlight when the correction is a full rewrite", () => {
    const html = renderToStaticMarkup(
      <CorrectionRetryPanel
        questionId="q1"
        firstAnswer="네"
        firstResult={{ ...result, correctedAnswer: "저는 회사원이에요" }}
        onRetry={() => undefined}
        onNext={() => undefined}
        isLast={false}
      />,
    )
    expect(html).not.toContain("What changed")
  })
})
