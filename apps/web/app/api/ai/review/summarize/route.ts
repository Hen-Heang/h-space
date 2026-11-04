import { z } from "zod"
import { jsonAiRoute } from "@/lib/server/ai"
import { USER_DATA_SYSTEM_RULE, userDataBlock } from "@/lib/server/user-data"

// Second Brain, Phase 6: Daily/Weekly Review. Unlike Ask Hengo, this route
// needs no retrieval of its own — the caller (lib/review.ts's format*Context
// helpers) already packages already-fetched counts/labels into one compact
// text block, so this is a plain jsonAiRoute: no post-generateObject step,
// no citations to resolve, no memory writes.
//
// That block still carries user-authored text (task, habit, reminder and goal
// names), so it goes to the model inside a <user_data> block framed as data,
// never instructions — the same rule every retrieval route follows
// (lib/server/user-data.ts).

const REVIEW_TYPES = ["morning", "evening", "weekly"] as const

const inputSchema = z.object({
  reviewType: z.enum(REVIEW_TYPES),
  context: z.string().trim().min(1).max(2000),
})

const outputSchema = z.object({
  summary: z.string(),
  focusSuggestion: z.string(),
})

const REVIEW_SYSTEM =
  "You are Hengo, a personal second-brain assistant. You'll be given a compact, pre-computed summary of the user's " +
  "own tasks/habits/goals/activity for a specific period — counts plus the names of the items they refer to, already " +
  "derived from their data. Write a short (1-2 sentence) honest, encouraging summary using ONLY the numbers and names " +
  "given — never invent counts, dates, or facts not present in the data. Then write one short, concrete " +
  "focusSuggestion: a single actionable nudge grounded in the same data (e.g. naming a specific overdue task or " +
  "at-risk goal if one exists) — if everything already looks on track, make it an encouraging note instead of " +
  "manufacturing a problem to solve. " +
  USER_DATA_SYSTEM_RULE

const REVIEW_LABELS: Record<(typeof REVIEW_TYPES)[number], string> = {
  morning: "a Morning Brief",
  evening: "an Evening Review",
  weekly: "a Weekly Review",
}

export const POST = jsonAiRoute({
  inputSchema,
  outputSchema,
  system: REVIEW_SYSTEM,
  feature: "review_summary",
  buildPrompt: (input) =>
    `Write ${REVIEW_LABELS[input.reviewType]} for this data:\n\n${userDataBlock(input.context)}`,
})
