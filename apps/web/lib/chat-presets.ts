import {
  Briefcase,
  Coffee,
  Laptop,
  SearchCode,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react"

// One-click AI Coach conversation presets. Each kicks off a multi-turn roleplay
// by sending a single instruction message as the conversation's first turn —
// the same trick lib/interview.ts uses for the mock-interview system prompt,
// just condensed into one user-authored message instead of a separate API field.
export interface ChatPreset {
  id: string
  /** Shown in a neutral tile on the chat welcome screen. */
  icon: LucideIcon
  label: string
  description: string
  prompt: string
}

export const CHAT_PRESETS: ChatPreset[] = [
  {
    id: "workplace",
    icon: Briefcase,
    label: "Workplace Korean",
    description: "Casual chat with a coworker before a meeting",
    prompt:
      "Roleplay: you're my Korean coworker and we're chatting casually before a meeting starts. Speak naturally in polite workplace Korean (해요체), ask me about my weekend or current task, and gently correct any mistakes I make. Start now with your first line.",
  },
  {
    id: "dev-meeting",
    icon: Laptop,
    label: "Developer Meeting",
    description: "Sprint update with your team lead",
    prompt:
      "Roleplay: you're my team lead in a Korean tech meeting. We're discussing my current sprint tasks. Ask me one question at a time about my progress and blockers, speak in professional Korean, and correct my Korean when needed. Start the meeting now.",
  },
  {
    id: "code-review",
    icon: SearchCode,
    label: "Code Review",
    description: "Explain your PR to a senior developer",
    prompt:
      "Roleplay: you're a senior developer reviewing my pull request in Korean. Ask me to explain my changes, give feedback in Korean, and help me respond naturally and politely. Start by asking about my PR.",
  },
  {
    id: "lunch",
    icon: UtensilsCrossed,
    label: "Lunch Conversation",
    description: "Small talk over lunch with coworkers",
    prompt:
      "Roleplay: we're coworkers having lunch together in Korea. Make small talk in casual but polite Korean about food, weekend plans, and office life. Correct my Korean gently as we chat. Start the conversation now.",
  },
  {
    id: "weekend",
    icon: Coffee,
    label: "Weekend Small Talk",
    description: "Monday morning catch-up",
    prompt:
      "Roleplay: it's Monday morning and you're asking me about my weekend in Korean. Keep it casual and friendly (해요체), ask follow-up questions, and correct any mistakes I make. Start now.",
  },
]
