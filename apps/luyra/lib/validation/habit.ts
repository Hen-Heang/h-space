import { z } from "zod";

export const habitCategorySchema = z.enum([
  "exercise",
  "reading",
  "meditation",
  "sleep",
  "water",
  "study",
  "coding",
  "deep_work",
  "walking",
  "custom",
]);

export const createHabitSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(80),
  category: habitCategorySchema.optional(),
  identityStatement: z.string().trim().max(120).optional(),
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;

export const updateHabitSchema = z
  .object({
    label: z.string().trim().min(1, "Label is required").max(80).optional(),
    category: habitCategorySchema.optional(),
    identityStatement: z.string().trim().max(120).nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;

export const checkinDateSchema = z.string().date();
