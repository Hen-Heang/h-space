import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { INTERVIEW_MODES } from "@/lib/interview-modes"

import { EvaluationSummary } from "./EvaluationSummary"
import { MOCK_SCORECARD_DISCLAIMER } from "./ScoreHonestyNote"

function render(scores: { label: string; score: number; max: number }[]) {
  return renderToStaticMarkup(
    <EvaluationSummary
      mode={INTERVIEW_MODES.practice}
      evaluation={{ scores, summary: "Clear answers.", advice: [] }}
      analytics={null}
      history={[]}
      onPracticeAgain={() => undefined}
      onBackToTopics={() => undefined}
    />,
  )
}

describe("EvaluationSummary", () => {
  it("explains that criteria scores come from the transcript, not audio", () => {
    const html = render([
      { label: "Speaking", score: 4, max: 5 },
      { label: "Pronunciation", score: 3, max: 5 },
    ])
    expect(html).toContain(MOCK_SCORECARD_DISCLAIMER.replace(/'/g, "&#x27;"))
  })

  it("omits the score note when no scores came back", () => {
    const html = render([])
    expect(html).not.toContain("never analyzes your audio")
  })
})
