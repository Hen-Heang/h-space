// Readable labels for the Phrasebook's stored filter keys. Cards store
// machine keys ("requirement-clarification", "code-review-feedback") — those
// stay untouched in the database, in imports and in filter state; only what
// the learner reads changes. Unknown keys (from a user's own import) fall back
// to a humanized form of the key, so nothing ever renders blank.

export const SITUATION_LABELS: Record<string, string> = {
  // Starter packs
  "status-update": "Give a status update",
  deadline: "Talk about deadlines",
  blocker: "Talk about difficulties",
  help: "Offer or ask for help",
  ownership: "Who owns the task",
  report: "Report completion",
  requirements: "Ask what's needed",
  schedule: "Plan the day",
  feedback: "Ask for feedback",
  "small-talk": "Small talk",
  restaurant: "At a restaurant",
  "convenience-store": "At a convenience store",
  taxi: "Taking a taxi",
  directions: "Asking for directions",
  hospital: "At the hospital",
  transportation: "Public transport",
  delivery: "Deliveries",
  // Developer-work keys used by imported and work-focus packs
  "requirement-clarification": "Clarify requirements",
  "code-review-feedback": "Review feedback",
  "blocker-delay": "Report a blocker",
  "test-failure": "Report a test failure",
  "confirm-understanding": "Confirm what you understood",
  "confirm-criterion": "Confirm a criterion",
  "confirm-scope": "Confirm the scope",
  "ask-repetition": "Ask someone to repeat",
  "explain-screen": "Explain a screen",
  "describe-change": "Describe a change",
  "unchanged-behavior": "Explain what stays the same",
  "work-status": "Say where the work stands",
  "test-evidence": "Report test results",
  "request-review": "Request a review",
  "respond-feedback": "Respond to feedback",
  "update-estimate": "Update an estimate",
  "check-meaning": "Check your intended meaning",
  "bug-report": "Report a bug",
  "business-rule": "Read a business rule",
  "work-diary": "Write a work diary",
}

const CATEGORY_LABELS: Record<string, string> = {
  workplace: "Workplace",
  daily: "Daily life",
  developer: "Developer work",
  "work-focus": "Korean for my work",
  exam: "Exam prep",
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
}

/** "requirement-clarification" → "Requirement clarification". */
export function humanizeKey(key: string): string {
  const words = key.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
  if (!words) return key
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function situationLabel(key: string): string {
  return SITUATION_LABELS[key] ?? humanizeKey(key)
}

export function categoryLabel(key: string): string {
  return CATEGORY_LABELS[key] ?? humanizeKey(key)
}

export function difficultyLabel(key: string): string {
  return DIFFICULTY_LABELS[key] ?? humanizeKey(key)
}
