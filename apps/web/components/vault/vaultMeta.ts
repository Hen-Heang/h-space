import {
  Bot,
  CodeXml,
  Landmark,
  ListTodo,
  Mail,
  MapPin,
  Shapes,
  ShoppingBag,
  Smartphone,
  Users,
  type LucideIcon,
} from "lucide-react"

import type { VaultCategoryId, VaultStatus } from "@/lib/vault"

// Presentation for H-Vault categories/statuses. Full literal Tailwind classes
// only — the scanner can't see constructed ones.

type CategoryStyle = { icon: LucideIcon; tone: string }

const CATEGORY_STYLES: Record<VaultCategoryId, CategoryStyle> = {
  email: { icon: Mail, tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  development: { icon: CodeXml, tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  "ai-tools": { icon: Bot, tone: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  social: { icon: Users, tone: "bg-pink-500/10 text-pink-600 dark:text-pink-400" },
  finance: { icon: Landmark, tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  shopping: { icon: ShoppingBag, tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  productivity: { icon: ListTodo, tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  "korea-local": { icon: MapPin, tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  devices: { icon: Smartphone, tone: "bg-slate-500/10 text-slate-600 dark:text-slate-300" },
  other: { icon: Shapes, tone: "bg-muted text-muted-foreground" },
}

/** Unknown (future custom) categories fall back to "Other"'s look. */
export function categoryStyle(category: string): CategoryStyle {
  return CATEGORY_STYLES[category as VaultCategoryId] ?? CATEGORY_STYLES.other
}

export const STATUS_TONES: Record<VaultStatus, string> = {
  active: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  needs_review: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  inactive: "border-border bg-muted/60 text-muted-foreground",
}
