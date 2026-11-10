import type { LucideIcon } from "lucide-react"
import { CircleCheck, CircleX, Clock3, Eye } from "lucide-react"
import type { SubscriptionStatus } from "@/types/finance"

export const SUBSCRIPTION_STATUS_META: Record<
  SubscriptionStatus,
  { label: string; textClass: string; icon: LucideIcon }
> = {
  // Keep is the neutral default, so it isn't coloured; the states that ask
  // for a decision are. Every status also carries its own icon and label.
  keep: { label: "Keep", textClass: "text-foreground", icon: CircleCheck },
  review: { label: "Review", textClass: "text-warning", icon: Eye },
  plan_to_cancel: { label: "Plan to cancel", textClass: "text-warning", icon: Clock3 },
  cancelled: { label: "Cancelled", textClass: "text-muted-foreground", icon: CircleX },
}
