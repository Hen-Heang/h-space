import { z } from "zod";

export const reviewRatingSchema = z.enum(["AGAIN", "HARD", "GOOD", "EASY"]);

export const createVocabCardSchema = z.object({
  category: z.string().trim().min(1).max(100).optional(),
  term: z.string().trim().min(1, "Term is required").max(200),
  meaning: z.string().trim().min(1, "Meaning is required").max(500),
  pronunciation: z.string().trim().max(300).optional(),
  example: z.string().trim().max(1000).optional(),
  exampleTranslation: z.string().trim().max(1000).optional(),
  tags: z.array(z.string().trim().max(50)).max(10).optional(),
});
export type CreateVocabCardInput = z.infer<typeof createVocabCardSchema>;

export const updateVocabCardSchema = z
  .object({
    category: z.string().trim().min(1).max(100).optional(),
    term: z.string().trim().min(1).max(200).optional(),
    meaning: z.string().trim().min(1).max(500).optional(),
    pronunciation: z.string().trim().max(300).nullable().optional(),
    example: z.string().trim().max(1000).nullable().optional(),
    exampleTranslation: z.string().trim().max(1000).nullable().optional(),
    tags: z.array(z.string().trim().max(50)).max(10).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
export type UpdateVocabCardInput = z.infer<typeof updateVocabCardSchema>;

export const dailyStudyModeSchema = z.enum(["busy", "normal", "office"]);

export const activityActionSchema = z.object({
  activityId: z.string().min(1),
  action: z.enum(["start", "complete", "skip"]),
  skipReason: z.string().trim().max(500).optional(),
});
export type ActivityActionInput = z.infer<typeof activityActionSchema>;

export const dailyStudyPlanPatchSchema = z
  .object({
    planId: z.string().min(1),
    activityAction: activityActionSchema.optional(),
    reflection: z.string().trim().max(4000).optional(),
    missionResult: z.string().trim().max(2000).optional(),
  })
  .refine((data) => data.activityAction || data.reflection !== undefined || data.missionResult !== undefined, {
    message: "At least one field must be provided",
  });
export type DailyStudyPlanPatchInput = z.infer<typeof dailyStudyPlanPatchSchema>;
