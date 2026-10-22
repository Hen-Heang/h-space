import type { LucideIcon } from "lucide-react"
import {
  BookOpen,
  BookOpenText,
  Headphones,
  Languages,
  MessagesSquare,
  Mic,
  Sparkles,
} from "lucide-react"

// Single source of truth for the `/learn` (Study) hub's cards. `/learn` is the
// landing page of the mobile/tablet "Korean" tab (see `primaryNavItems` in
// lib/navigation.ts), which is the only Korean slot in that nav — so this hub
// is the front door to every Korean area: practice, vocabulary, the voice
// coach, phrases, foundations, reading, and listening. Foundations and Reading are modes of the merged Phrasebook hub
// (`?mode=foundations` / `?mode=reading` on `/phrasebook` — see
// app/(main)/phrasebook/page.tsx), not separate routes.
export type LearningModule = {
  id: string
  title: string
  description: string
  href: string
  icon: LucideIcon
  badge?: string
  /** Featured modules get stronger visual hierarchy on the Study hub. */
  featured?: boolean
  statusLabel?: string
}

export const learningModules: LearningModule[] = [
  {
    id: "practice",
    title: "Daily Practice",
    description: "Today's Korean practice session.",
    href: "/practice",
    icon: Sparkles,
    badge: "Korean",
  },
  {
    id: "vocab",
    title: "Vocabulary",
    description: "Review your words with spaced repetition.",
    href: "/vocab",
    icon: BookOpen,
    badge: "Korean",
  },
  {
    id: "korean-coach",
    title: "Korean Coach",
    description: "Listening and speaking practice with AI feedback.",
    href: "/korean-coach",
    icon: Mic,
    badge: "Korean",
  },
  {
    id: "phrasebook",
    title: "Workplace & Daily Phrases",
    description: "Practice real Q&A for work and everyday situations.",
    href: "/phrasebook",
    icon: MessagesSquare,
    badge: "Korean",
  },
  {
    id: "foundations",
    title: "Foundations",
    description: "Hangul and grammar basics to build your Korean from the ground up.",
    href: "/phrasebook?mode=foundations",
    icon: Languages,
    badge: "Korean",
  },
  {
    id: "reading",
    title: "Reading",
    description: "Real reading passages with comprehension practice.",
    href: "/phrasebook?mode=reading",
    icon: BookOpenText,
    badge: "Korean",
  },
  {
    id: "listening",
    title: "Listening",
    description: "Audio dictation and listening comprehension drills.",
    href: "/listening",
    icon: Headphones,
    badge: "Korean",
  },
]
