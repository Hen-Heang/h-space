import type { LucideIcon } from "lucide-react"
import { BookOpen, Headphones, MessagesSquare, Mic } from "lucide-react"

// The Learning Hub's (`/learn`) quick-access tiles: the four everyday skills.
// Everything else in the Learning workspace — Foundations, Reading,
// Scenarios, Exam Prep, History — is listed under the hub's Library, derived
// from the nav registry (components/learn/LibraryList.tsx). Foundations and
// Reading are modes of the merged Phrasebook hub (`?mode=foundations` /
// `?mode=reading` on `/phrasebook`), not separate routes.
export type LearningModule = {
  id: "speaking" | "listening" | "vocab" | "phrases"
  title: string
  description: string
  href: string
  icon: LucideIcon
}

export const quickAccessModules: LearningModule[] = [
  {
    id: "speaking",
    title: "Speaking",
    description: "Korean Coach scenarios with feedback",
    href: "/korean-coach",
    icon: Mic,
  },
  {
    id: "listening",
    title: "Listening",
    description: "Dialogues with a comprehension quiz",
    href: "/listening",
    icon: Headphones,
  },
  {
    id: "vocab",
    title: "Vocabulary",
    description: "Spaced-repetition word review",
    href: "/vocab",
    icon: BookOpen,
  },
  {
    id: "phrases",
    title: "Phrases",
    description: "Workplace and daily Q&A",
    href: "/phrasebook",
    icon: MessagesSquare,
  },
]
