import type { UseFormReturn } from "react-hook-form"
import { z } from "zod"

// Single source of truth lives in lib/goals.ts — re-exported here so the goal
// form modules can keep importing GoalType from one place.
export type { GoalType } from "./goals"

// Schema + shared constants for the custom goal form (ported from Orbit
// goal-form/types.ts). The user_context / structure fields back the deferred AI
// flow but are kept in the schema so nothing silently drops.
export const goalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  icon: z.string().optional(),
  description: z.string().optional(),
  target_date: z.date({ message: "Target date is required" }),
  start_date: z.date().optional(),
  goal_type: z.enum(["general", "travel", "finance", "education", "financial"]),
  priority: z.enum(["low", "medium", "high"]).optional(),
  category: z.string().optional(),
  milestones: z
    .array(
      z.object({
        title: z.string().min(1, "Milestone title is required"),
        due_date: z.date().optional(),
      }),
    )
    .optional(),
  template_id: z.string().optional(),
  generate_tasks_with_ai: z.boolean().optional(),
  ai_prompt: z.string().optional(),
  // NOTE: there is deliberately no `recurrence` field here. It used to exist
  // in this schema (and be written to metadata) with no UI and no consumer.
  // Recurrence is now a first-class, structured concept — `goal_schedule_rules`
  // (lib/goal-schedule-rules.ts), created from the goal's Schedule tab.
  travel_destination: z.string().optional(),
  travel_accommodation: z.string().optional(),
  travel_transportation: z.string().optional(),
  travel_budget: z.string().optional(),
  travel_activities: z.string().optional(),
})

export const goalTypes = [
  { value: "general", label: "General Goal", icon: "Sparkles" },
  { value: "travel", label: "Travel Plan", icon: "Plane" },
  { value: "finance", label: "Financial Goal", icon: "Calendar" },
  { value: "education", label: "Education Goal", icon: "Calendar" },
] as const

export const travelActivities = [
  "sightseeing",
  "hiking",
  "shopping",
  "relaxing",
  "adventure",
  "food tours",
  "cultural experiences",
  "beach",
  "museums",
  "nightlife",
] as const

export type GoalFormValues = z.infer<typeof goalSchema>

export type GoalFormStep = "basics" | "travel" | "user-context" | "structure" | "advanced"

/**
 * The custom goal form's step order: basics → (travel details, travel goals
 * only) → advanced, where the goal is submitted. Travel used to send "next"
 * back to the step it was already on, so a travel goal never reached submit.
 */
export function nextGoalFormStep(step: GoalFormStep, goalType: string): GoalFormStep {
  if (step === "basics" && goalType === "travel") return "travel"
  return "advanced"
}

export function prevGoalFormStep(step: GoalFormStep, goalType: string): GoalFormStep {
  if (step === "advanced" && goalType === "travel") return "travel"
  return "basics"
}

export interface GoalFormProps {
  onSuccess: (goal: unknown) => void
  initialData?: {
    title: string
    icon?: string
    description: string
    target_date: string
    goal_type: string
    travel_details?: {
      destination?: string
      accommodation?: string
      transportation?: string
      budget?: string
      activities?: string[]
    }
  }
  onClose?: () => void
  refetchGoals?: () => void
  isEdit?: boolean
  goalId?: string
}

export type FormStepProps = {
  form: UseFormReturn<GoalFormValues>
}
