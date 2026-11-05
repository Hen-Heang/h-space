"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { BasicInfoStep } from "@/components/goals/form/BasicInfoStep"
import { TravelDetailsStep } from "@/components/goals/form/TravelDetailsStep"
import { AdvancedStep } from "@/components/goals/form/AdvancedStep"
import { useCreateGoal, useUpdateGoal } from "@/hooks/useGoalMutations"
import {
  type GoalFormProps,
  type GoalFormStep,
  type GoalFormValues,
  type GoalType,
  goalSchema,
  nextGoalFormStep,
  prevGoalFormStep,
} from "@/lib/goal-form"
import type { GoalMetadata } from "@/lib/goals"
import { cn } from "@/lib/utils"

export function GoalFormContainer({
  onSuccess,
  initialData,
  onClose,
  refetchGoals,
  isEdit = false,
  goalId,
}: GoalFormProps) {
  const { createGoal, isLoading: isCreating } = useCreateGoal()
  const { updateGoal, isLoading: isUpdating } = useUpdateGoal()
  const router = useRouter()
  const isLoading = isCreating || isUpdating
  const [step, setStep] = useState<GoalFormStep>("basics")
  const [selectedActivities, setSelectedActivities] = useState<string[]>(
    initialData?.travel_details?.activities ?? [],
  )

  const getInitialDate = () => {
    if (initialData?.target_date) {
      const date = new Date(initialData.target_date)
      if (!isNaN(date.getTime())) return date
    }
    const date = new Date()
    date.setMonth(date.getMonth() + 1)
    return date
  }

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: initialData?.title || "",
      icon: initialData?.icon || "",
      description: initialData?.description || "",
      target_date: getInitialDate(),
      start_date: new Date(),
      goal_type: (initialData?.goal_type as GoalType) || "general",
      priority: undefined,
      category: "",
      milestones: [],
      template_id: "",
      generate_tasks_with_ai: false,
      ai_prompt: "",
      travel_destination: initialData?.travel_details?.destination || "",
      travel_accommodation: initialData?.travel_details?.accommodation || "",
      travel_transportation: initialData?.travel_details?.transportation || "",
      travel_budget: initialData?.travel_details?.budget || "",
      travel_activities: "",
    },
  })

  const selectedGoalType = form.watch("goal_type") as GoalType

  const toggleActivity = (activity: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity],
    )
  }

  const handleSubmit = async () => {
    const values = form.getValues()

    const metadata: GoalMetadata = {
      version: 1,
      goal_type: values.goal_type,
      icon: values.icon || undefined,
      priority: values.priority,
      category: values.category,
      start_date: values.start_date?.toISOString(),
      milestones:
        values.milestones?.map((m) => ({
          title: m.title || "",
          due_date: m.due_date?.toISOString(),
        })) || [],
      template_id: values.template_id,
      // No `recurrence` key: recurring commitments are schedule rules now
      // (goal_schedule_rules), created from the goal's Schedule tab. Existing
      // goals keep whatever metadata.recurrence they already have — it's read
      // as legacy data, never written here.
    }

    if (values.goal_type === "travel") {
      metadata.travel_destination = values.travel_destination
      metadata.travel_accommodation = values.travel_accommodation
      metadata.travel_transportation = values.travel_transportation
      metadata.travel_budget = values.travel_budget
      metadata.travel_activities = selectedActivities
    }

    const aiOptions = {
      generateTasksWithAI: values.generate_tasks_with_ai,
      aiPrompt: values.ai_prompt,
    }

    const result =
      isEdit && goalId
        ? await updateGoal(
            goalId,
            {
              title: values.title,
              description: values.description || "",
              target_date: values.target_date,
              start_date: values.start_date,
              metadata: {
                ...metadata,
                start_date: values.start_date?.toISOString() || new Date().toISOString(),
              },
            },
            aiOptions,
          )
        : await createGoal(
            {
              title: values.title,
              description: values.description,
              target_date: values.target_date,
              start_date: values.start_date,
              metadata,
            },
            aiOptions,
          )

    if (result.success && result.goal) {
      onSuccess(result.goal)
      form.reset()
      setStep("basics")
      setSelectedActivities([])
      onClose?.()
      refetchGoals?.()
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/goals/create")}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="h-6 w-px bg-border" />
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-semibold">{isEdit ? "Edit goal" : "Create new goal"}</h1>
          <p className="text-xs text-muted-foreground">
            {isEdit ? "Update your goal details" : "Set up your goal in 2 simple steps"}
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3">
        {(["basics", "advanced"] as const).map((s, i) => {
          // Travel details are part of step 1 ("Goal details").
          const active = s === "basics" ? step !== "advanced" : step === "advanced"
          return (
            <div key={s} className="flex items-center gap-3">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                    active ? "bg-background text-primary" : "bg-foreground/10",
                  )}
                >
                  {i + 1}
                </span>
                <span className="hidden sm:inline">
                  {i === 0 ? "Goal details" : "AI assistant"}
                </span>
              </div>
              {i === 0 && <div className="h-1 w-12 rounded-full bg-muted sm:w-20" />}
            </div>
          )
        })}
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <Form {...form}>
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            {step === "basics" ? (
              <BasicInfoStep
                form={form}
                onNextStep={() => setStep(nextGoalFormStep(step, selectedGoalType))}
                selectedGoalType={selectedGoalType}
              />
            ) : step === "travel" && selectedGoalType === "travel" ? (
              <TravelDetailsStep
                form={form}
                onPrevStep={() => setStep(prevGoalFormStep(step, selectedGoalType))}
                onNextStep={() => setStep(nextGoalFormStep(step, selectedGoalType))}
                selectedActivities={selectedActivities}
                toggleActivity={toggleActivity}
              />
            ) : (
              <AdvancedStep
                form={form}
                onPrevStep={() => setStep(prevGoalFormStep(step, selectedGoalType))}
                onSubmit={handleSubmit}
                isSubmitting={isLoading}
                isEdit={isEdit}
              />
            )}
          </form>
        </Form>
      </div>
    </div>
  )
}
