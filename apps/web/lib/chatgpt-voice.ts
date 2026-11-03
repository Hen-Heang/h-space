// Optional free-form conversation practice in ChatGPT's voice mode. H-Space
// only builds a prompt the learner copies and opens ChatGPT in a new tab: no
// API call, no new paid service, and nothing comes back into H-Space — the UI
// must say so. Pure; tested.

import type { DisplayScriptSection } from "@/lib/exam-prep-home"
import type { InterviewTopic } from "@/lib/interview"

/** ChatGPT's public web address; voice mode is started from its own UI. */
export const CHATGPT_URL = "https://chatgpt.com/"

export type VoicePracticeStyle = "practice" | "exam"

/**
 * The role-play prompt for ChatGPT. Contains the topic and the examiner's
 * question plan; the learner's script only when they opt in.
 */
export function buildVoicePracticePrompt({
  topic,
  style,
  script,
}: {
  topic: Pick<InterviewTopic, "labelKo" | "label" | "examinerBrief">
  style: VoicePracticeStyle
  /** Included verbatim when provided (opt-in). */
  script?: DisplayScriptSection[] | null
}): string {
  const lines = [
    "Let's practice a Korean speaking exam (K-Specialist spoken Q&A) by voice.",
    "",
    "Your role: a friendly but realistic Korean examiner.",
    "- Speak only Korean, slowly and clearly, in polite 해요/합니다 style.",
    "- Ask ONE short question at a time, then wait for my answer.",
    "- Follow up on what I say, the way a real examiner would; sometimes rephrase a question.",
    "- My target is short, clear answers of 1–3 sentences in simple Korean.",
    style === "practice"
      ? "- After each answer, give one short tip in English (grammar or a more natural phrase), then ask the next question."
      : '- Exam conditions: no feedback until I say "끝". Then give brief feedback in English on fluency, vocabulary, and confidence.',
    "- Don't give me a pronunciation score. If a word was unclear, just tell me which one and how to say it.",
    "",
    `Exam topic: ${topic.labelKo} (${topic.label})`,
    "",
    "Question plan:",
    topic.examinerBrief,
  ]
  if (script && script.length > 0) {
    lines.push(
      "",
      "My prepared script (ask about details in it, and also about things it doesn't cover):",
      ...script.map((section) => `${section.title}\n${section.text}`),
    )
  }
  lines.push("", "Start now with a greeting and the first question, in Korean.")
  return lines.join("\n")
}
