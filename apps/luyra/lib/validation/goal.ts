import { z } from "zod";

export const goalCategorySchema = z.enum([
  "personal",
  "career",
  "finance",
  "learning",
  "health",
  "other",
]);
export const goalStatusSchema = z.enum(["active", "completed", "paused"]);

export const createGoalSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional(),
  category: goalCategorySchema.optional(),
  targetDate: z.string().date().optional(),
  progress: z.number().int().min(0).max(100).optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    category: goalCategorySchema.nullable().optional(),
    status: goalStatusSchema.optional(),
    targetDate: z.string().date().nullable().optional(),
    progress: z.number().int().min(0).max(100).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export const goalFiltersSchema = z.object({
  status: goalStatusSchema.optional(),
  category: goalCategorySchema.optional(),
});

export type GoalFilters = z.infer<typeof goalFiltersSchema>;
