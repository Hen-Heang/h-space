import {
  BookOpen,
  BriefcaseBusiness,
  Headphones,
  MessageCircle,
  MessagesSquare,
  Mic,
  RotateCcw,
  type LucideProps,
} from "lucide-react"

import type { MissionItemType } from "@/lib/learning/mission-engine"

// A real, statically-defined component (not a value returned from a plain
// function) — assigning a component reference from a function call inside
// another component's render body trips the React Compiler's "components
// created during render" check, so the per-type switch lives here instead.
export function MissionItemIcon({ type, ...props }: { type: MissionItemType } & LucideProps) {
  switch (type) {
    case "vocab_review":
      return <BookOpen {...props} />
    case "correction_review":
      return <RotateCcw {...props} />
    case "phrase_review":
    case "daily_phrase":
      return <MessagesSquare {...props} />
    case "listening":
      return <Headphones {...props} />
    case "scenario":
      return <Mic {...props} />
    case "interview":
      return <MessageCircle {...props} />
    case "work_message":
      return <BriefcaseBusiness {...props} />
  }
}
