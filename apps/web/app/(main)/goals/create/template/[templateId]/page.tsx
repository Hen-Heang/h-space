"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  Zap,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getTemplateById } from "@/lib/goal-templates"
import type { CompoundField, FormField, FormSection, ListField } from "@/lib/goal-templates/types"
import { useCreateGoal } from "@/hooks/useGoalMutations"
import { cn } from "@/lib/utils"

export default function TemplateFormPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const router = useRouter()
  const { createGoal, isLoading: isCreating } = useCreateGoal()

  const template = getTemplateById(templateId)
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [currentSection, setCurrentSection] = useState(0)

  if (!template) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="pt-10 pb-6 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-semibold">Template not found</CardTitle>
            <CardDescription>The requested template could not be identified.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-10">
            <Button onClick={() => router.push("/goals/create")}>Back to templates</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const validateField = (field: FormField, value: unknown): string | null => {
    if (field.required) {
      if (value === undefined || value === null || value === "") return `${field.label} is required`
      if (typeof value === "string" && value.trim() === "") return `${field.label} is required`
      if (Array.isArray(value) && value.length === 0) return `${field.label} is required`
    }
    if (field.type === "number" && value !== undefined && value !== "" && value !== null) {
      const numValue = Number(value)
      if (isNaN(numValue)) return `${field.label} must be a valid number`
      const numField = field as { min?: number; max?: number }
      if (numField.min !== undefined && numValue < numField.min)
        return `${field.label} must be at least ${numField.min}`
      if (numField.max !== undefined && numValue > numField.max)
        return `${field.label} must be at most ${numField.max}`
    }
    if (field.type === "list" && Array.isArray(value)) {
      const listField = field as ListField
      if (listField.minItems !== undefined && value.length < listField.minItems)
        return `${field.label} must have at least ${listField.minItems} items`
      if (listField.maxItems !== undefined && value.length > listField.maxItems)
        return `${field.label} can have at most ${listField.maxItems} items`
    }
    if (field.type === "compound" && Array.isArray(value)) {
      const compoundField = field as CompoundField
      if (compoundField.minItems !== undefined && value.length < compoundField.minItems)
        return `${field.label} must have at least ${compoundField.minItems} items`
      if (compoundField.maxItems !== undefined && value.length > compoundField.maxItems)
        return `${field.label} can have at most ${compoundField.maxItems} items`
    }
    return null
  }

  const validateSection = (section: FormSection): boolean => {
    const sectionErrors: Record<string, string> = {}
    let hasError = false
    section.fields.forEach((field) => {
      const error = validateField(field, formData[field.id])
      if (error) {
        sectionErrors[field.id] = error
        hasError = true
      }
    })
    setErrors((prev) => ({ ...prev, ...sectionErrors }))
    return !hasError
  }

  const handleNext = () => {
    if (validateSection(template.sections[currentSection])) {
      if (currentSection < template.sections.length - 1) {
        setCurrentSection((s) => s + 1)
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    } else {
      toast.error("Please complete all required fields in this section.")
    }
  }

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection((s) => s - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleSubmit = async (skipTemplateData = false) => {
    if (!skipTemplateData) {
      let allValid = true
      template.sections.forEach((section) => {
        if (!validateSection(section)) allValid = false
      })
      if (!allValid) {
        toast.error("Please complete all sections before creating the goal.")
        return
      }
    }

    const generatedPrompt = skipTemplateData ? "" : template.generatePrompt(formData)
    const generatedDescription = skipTemplateData
      ? template.description
      : template.generateDescription(formData)

    const result = await createGoal(
      {
        title: template.name,
        description: generatedDescription,
        target_date: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
        start_date: new Date(),
        metadata: {
          version: 1,
          goal_type: "general",
          icon: template.icon,
          template_id: template.id,
          template_name: template.name,
          template_data: skipTemplateData ? {} : formData,
          template_completed: !skipTemplateData,
        },
      },
      { generateTasksWithAI: !skipTemplateData, aiPrompt: generatedPrompt },
    )

    if (result.success && result.goal?.id) {
      router.push(`/goals/${result.goal.id}`)
    }
  }

  const updateFormData = (fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }))
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[fieldId]
        return next
      })
    }
  }

  const section = template.sections[currentSection]
  const progress = ((currentSection + 1) / template.sections.length) * 100

  const renderField = (field: FormField) => {
    const value = formData[field.id]
    const error = errors[field.id]
    const labelEl = (
      <Label htmlFor={field.id} className="ml-1 text-xs font-medium text-muted-foreground">
        {field.label} {field.required && <span className="text-primary">*</span>}
      </Label>
    )
    const errorEl = error && (
      <p className="ml-1 mt-1 flex items-center gap-1.5 text-xs font-semibold text-destructive">
        <AlertCircle className="h-3.5 w-3.5" />
        {error}
      </p>
    )

    switch (field.type) {
      case "text":
      case "time":
      case "number":
        return (
          <div key={field.id} className="space-y-2">
            {labelEl}
            <Input
              id={field.id}
              type={field.type}
              placeholder={field.placeholder}
              value={value !== undefined && value !== null ? String(value) : ""}
              onChange={(e) =>
                updateFormData(
                  field.id,
                  field.type === "number"
                    ? e.target.value === ""
                      ? ""
                      : Number(e.target.value)
                    : e.target.value,
                )
              }
              className={cn(error && "border-destructive/50 bg-destructive/5")}
            />
            {field.helperText && !error && (
              <p className="ml-1 text-xs font-medium text-muted-foreground">
                {field.helperText}
              </p>
            )}
            {errorEl}
          </div>
        )

      case "textarea":
        return (
          <div key={field.id} className="space-y-2">
            {labelEl}
            <Textarea
              id={field.id}
              placeholder={field.placeholder}
              value={(value as string) || ""}
              onChange={(e) => updateFormData(field.id, e.target.value)}
              className={cn("min-h-[120px]", error && "border-destructive/50 bg-destructive/5")}
            />
            {field.helperText && !error && (
              <p className="ml-1 text-xs font-medium text-muted-foreground">
                {field.helperText}
              </p>
            )}
            {errorEl}
          </div>
        )

      case "list": {
        const listValue = (value as string[]) || []
        return (
          <div key={field.id} className="space-y-3">
            {labelEl}
            <AnimatePresence mode="popLayout">
              {listValue.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex gap-2"
                >
                  <Input
                    type="text"
                    placeholder={field.placeholder}
                    value={item || ""}
                    onChange={(e) => {
                      const newList = [...listValue]
                      newList[index] = e.target.value
                      updateFormData(field.id, newList)
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      updateFormData(
                        field.id,
                        listValue.filter((_, i) => i !== index),
                      )
                    }
                    className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
            <Button
              type="button"
              variant="outline"
              onClick={() => updateFormData(field.id, [...listValue, ""])}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4" /> Add {field.label}
            </Button>
            {errorEl}
          </div>
        )
      }

      case "compound": {
        const compoundField = field as CompoundField
        const compoundValue = (value as Record<string, string>[]) || []
        return (
          <div key={field.id} className="space-y-4">
            {labelEl}
            <AnimatePresence mode="popLayout">
              {compoundValue.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className="rounded-2xl">
                    <CardContent className="space-y-4 p-5">
                      {compoundField.fields.map((subField) => (
                        <div key={subField.id} className="space-y-2">
                          <Label className="ml-1 text-xs font-medium text-muted-foreground/70">
                            {subField.label}
                          </Label>
                          <Input
                            placeholder={subField.placeholder}
                            value={item[subField.id] || ""}
                            onChange={(e) => {
                              const next = [...compoundValue]
                              next[index] = { ...next[index], [subField.id]: e.target.value }
                              updateFormData(field.id, next)
                            }}
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          updateFormData(
                            field.id,
                            compoundValue.filter((_, i) => i !== index),
                          )
                        }
                        className="w-full text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove entry
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const newItem: Record<string, string> = {}
                compoundField.fields.forEach((f) => (newItem[f.id] = ""))
                updateFormData(field.id, [...compoundValue, newItem])
              }}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4" /> Add {field.label}
            </Button>
            {errorEl}
          </div>
        )
      }

      default:
        return null
    }
  }

  const isLastSection = currentSection === template.sections.length - 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to templates"
            onClick={() => router.push("/goals/create")}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
              style={{ background: template.color }}
            >
              {template.icon}
            </div>
            <div className="min-w-0">
              {/* h2: the shell header owns the page's only h1. */}
              <h2 className="truncate text-base font-semibold tracking-tight">{template.name}</h2>
              <p className="text-xs font-medium text-muted-foreground">{template.category}</p>
            </div>
          </div>
        </div>
        <div className="hidden flex-col items-end sm:flex">
          <span className="text-xs font-medium text-muted-foreground">
            Section {currentSection + 1} of {template.sections.length}
          </span>
          <span className="text-xs font-semibold text-primary">
            {Math.round(progress)}% complete
          </span>
        </div>
      </div>

      {/* Section breadcrumb */}
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-3 px-1">
          {template.sections.map((sec, idx) => (
            <button
              key={sec.id}
              onClick={() => idx <= currentSection && setCurrentSection(idx)}
              disabled={idx > currentSection}
              className={cn(
                "flex items-center gap-2.5 rounded-2xl px-5 py-2.5 text-xs font-medium transition-all",
                idx === currentSection
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : idx < currentSection
                    ? "border border-blue-500/20 bg-blue-500/10 text-blue-500"
                    : "cursor-not-allowed border border-border bg-muted text-muted-foreground opacity-50",
              )}
            >
              {idx < currentSection ? <Check className="h-4 w-4" /> : <span>{idx + 1}</span>}
              {sec.title}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_320px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card>
              <CardContent className="p-5 sm:p-6">
                <div className="mb-8 flex items-center gap-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-2xl">
                    {section.icon || template.icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
                    {section.description && (
                      <p className="mt-1 text-sm font-medium text-muted-foreground">
                        {section.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-5">{section.fields.map((field) => renderField(field))}</div>
              </CardContent>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-muted/30 px-6 py-6 sm:px-8">
                <Button
                  variant="ghost"
                  onClick={handlePrevious}
                  disabled={currentSection === 0}
                  className="gap-2"
                >
                  <ChevronLeft className="h-5 w-5" /> Previous
                </Button>

                {isLastSection ? (
                  <div className="flex w-full gap-3 sm:w-auto">
                    <Button
                      variant="outline"
                      onClick={() => handleSubmit(true)}
                      disabled={isCreating}
                      className="flex-1 sm:flex-none"
                    >
                      Skip details
                    </Button>
                    <Button
                      onClick={() => handleSubmit(false)}
                      disabled={isCreating}
                      className="flex-1 sm:flex-none"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Creating
                        </>
                      ) : (
                        "Create goal"
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button onClick={handleNext} className="w-full sm:w-auto">
                    Next <ChevronRight className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>

        <aside className="space-y-5">
          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-xl"
                  style={{ background: template.color }}
                >
                  {template.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold tracking-tight">
                    {template.name}
                  </h3>
                  <p className="text-xs font-medium text-primary/70">{template.category}</p>
                </div>
              </div>
              <p className="line-clamp-4 text-xs font-medium leading-relaxed text-muted-foreground">
                {template.description}
              </p>
            </CardContent>
          </Card>

          <div className="rounded-lg border border-primary/10 bg-primary/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Zap size={14} className="text-primary" />
              <span className="text-xs font-medium text-primary">Tip</span>
            </div>
            <p className="text-xs font-medium italic leading-relaxed text-foreground/80">
              Fill in the details and we&apos;ll prefill your goal. AI task generation arrives soon
              — your inputs are saved for it.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
