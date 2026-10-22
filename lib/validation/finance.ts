import { z } from "zod";

export const transactionTypeSchema = z.enum(["income", "expense"]);
export const subscriptionStatusSchema = z.enum(["keep", "review", "plan_to_cancel", "cancelled"]);
export const currencySchema = z.enum(["KRW", "USD"]);

// amountKrw is required when currency is KRW; originalAmount + exchangeRate are
// required when currency is USD (the service layer computes the canonical
// amountKrw as round(originalAmount * exchangeRate) — never trust a
// client-computed KRW figure for a foreign-currency entry).
export const createTransactionSchema = z
  .object({
    date: z.string().date(),
    type: transactionTypeSchema,
    categoryId: z.string().uuid().nullable().optional(),
    description: z.string().trim().min(1, "Description is required").max(200),
    currency: currencySchema.default("KRW"),
    amountKrw: z.number().positive().optional(),
    originalAmount: z.number().positive().optional(),
    exchangeRate: z.number().positive().optional(),
    paymentMethodId: z.string().uuid().nullable().optional(),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .refine((data) => data.currency !== "KRW" || data.amountKrw !== undefined, {
    message: "Amount is required",
    path: ["amountKrw"],
  })
  .refine((data) => data.currency !== "USD" || data.originalAmount !== undefined, {
    message: "Amount is required",
    path: ["originalAmount"],
  })
  .refine((data) => data.currency !== "USD" || data.exchangeRate !== undefined, {
    message: "Exchange rate is required",
    path: ["exchangeRate"],
  });
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = createTransactionSchema;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const recurringFrequencySchema = z.enum(["daily", "weekly", "monthly", "yearly"]);

// One schema for create and edit — a rule is always saved whole. `nextDate`
// is the next occurrence still to create; its day of month becomes the
// rule's anchor for monthly/yearly schedules.
export const recurringRuleSchema = z
  .object({
    type: transactionTypeSchema,
    description: z.string().trim().min(1, "Description is required").max(200),
    currency: currencySchema.default("KRW"),
    amountKrw: z.number().positive().optional(),
    originalAmount: z.number().positive().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    paymentMethodId: z.string().uuid().nullable().optional(),
    note: z.string().trim().max(500).nullable().optional(),
    frequency: recurringFrequencySchema,
    nextDate: z.string().date(),
    isActive: z.boolean().default(true),
  })
  .refine((data) => data.currency !== "KRW" || data.amountKrw !== undefined, {
    message: "Amount is required",
    path: ["amountKrw"],
  })
  .refine((data) => data.currency !== "USD" || data.originalAmount !== undefined, {
    message: "Amount is required",
    path: ["originalAmount"],
  });
export type RecurringRuleInput = z.infer<typeof recurringRuleSchema>;

const bulkIdsSchema = z
  .array(z.string().uuid())
  .min(1, "Select at least one transaction")
  .max(200, "Select at most 200 transactions at a time")
  .refine((ids) => new Set(ids).size === ids.length, "Duplicate transaction");

export const bulkTransactionActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("delete"), ids: bulkIdsSchema }),
  z.object({ action: z.literal("recategorize"), ids: bulkIdsSchema, categoryId: z.string().uuid().nullable() }),
]);
export type BulkTransactionActionInput = z.infer<typeof bulkTransactionActionSchema>;

export const descriptionSuggestionsQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  type: transactionTypeSchema.optional(),
});

export const transactionSortSchema = z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]);
export type TransactionSort = z.infer<typeof transactionSortSchema>;

export const transactionFiltersSchema = z.object({
  start: z.string().date(),
  end: z.string().date(),
  type: transactionTypeSchema.optional(),
  categoryId: z.string().uuid().optional(),
  paymentMethodId: z.string().uuid().optional(),
  amountMin: z.coerce.number().min(0).optional(),
  amountMax: z.coerce.number().min(0).optional(),
  search: z.string().trim().max(200).optional(),
  sort: transactionSortSchema.default("date_desc"),
  page: z.coerce.number().int().min(0).default(0),
});
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;

export const createTransactionTemplateSchema = z.object({
  type: transactionTypeSchema,
  description: z.string().trim().min(1, "Description is required").max(200),
  amountKrw: z.number().positive(),
  categoryId: z.string().uuid().nullable().optional(),
  paymentMethodId: z.string().uuid().nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
});
export type CreateTransactionTemplateInput = z.infer<typeof createTransactionTemplateSchema>;

export const upsertBudgetSchema = z.object({
  categoryId: z.string().uuid(),
  amountKrw: z.number().min(0),
});
export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>;

export const applyBudgetPlanSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM"),
  changes: z
    .array(
      z.object({
        categoryId: z.string().uuid(),
        amountKrw: z.number().int().min(0),
        // The budget the review showed, so a budget edited elsewhere since
        // then is detected even when the recommendation rounds the same.
        currentBudgetKrw: z.number().min(0),
      })
    )
    .min(1, "Select at least one budget to apply")
    .max(100)
    .refine((changes) => new Set(changes.map((c) => c.categoryId)).size === changes.length, "Duplicate category"),
});
export type ApplyBudgetPlanInput = z.infer<typeof applyBudgetPlanSchema>;

export const savingsGoalPurposeSchema = z.enum(["emergency_fund", "sinking_fund", "goal", "investment", "other"]);

export const createSavingsGoalSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  icon: z.string().trim().min(1).max(8).default("💰"),
  color: z.string().trim().min(1).max(16).default("#3b82f6"),
  targetUsd: z.number().min(0),
  currentUsd: z.number().min(0).default(0),
  deadline: z.string().date().nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
  purpose: savingsGoalPurposeSchema.nullable().default(null),
});
export type CreateSavingsGoalInput = z.infer<typeof createSavingsGoalSchema>;

export const updateSavingsGoalSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(80).optional(),
    icon: z.string().trim().min(1).max(8).optional(),
    color: z.string().trim().min(1).max(16).optional(),
    targetUsd: z.number().min(0).optional(),
    deadline: z.string().date().nullable().optional(),
    note: z.string().trim().max(500).nullable().optional(),
    purpose: savingsGoalPurposeSchema.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
export type UpdateSavingsGoalInput = z.infer<typeof updateSavingsGoalSchema>;

export const createContributionSchema = z.object({
  amountUsd: z.number().positive(),
});
export type CreateContributionInput = z.infer<typeof createContributionSchema>;

export const setSubscriptionStatusSchema = z.object({
  displayName: z.string().trim().min(1).max(200),
  status: subscriptionStatusSchema,
});
export type SetSubscriptionStatusInput = z.infer<typeof setSubscriptionStatusSchema>;

export const updatePreferencesSchema = z
  .object({
    monthlySpendingLimitKrw: z.number().min(0).nullable().optional(),
    targetSavingsRate: z.number().min(0).max(100).optional(),
    essentialTargetPct: z.number().min(0).max(100).optional(),
    budgetWatchThresholdPct: z.number().min(1).max(99).optional(),
    budgetNearLimitThresholdPct: z.number().min(1).max(99).optional(),
    monthlyReviewEnabled: z.boolean().optional(),
    financeReportEmail: z.string().trim().email().nullable().optional(),
    weeklyReportEmailEnabled: z.boolean().optional(),
    monthlyReportEmailEnabled: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })
  .refine(
    (data) =>
      data.budgetWatchThresholdPct === undefined ||
      data.budgetNearLimitThresholdPct === undefined ||
      data.budgetWatchThresholdPct < data.budgetNearLimitThresholdPct,
    { message: "The watch threshold must be lower than the near-limit threshold", path: ["budgetWatchThresholdPct"] }
  )
  .refine(
    (data) =>
      data.essentialTargetPct === undefined ||
      data.targetSavingsRate === undefined ||
      data.essentialTargetPct + data.targetSavingsRate <= 100,
    {
      message: "Essentials and Future targets can't add up to more than 100%",
      path: ["essentialTargetPct"],
    }
  );
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

export const monthQuerySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM");

export const categoryTypeSchema = z.enum(["income", "expense", "both"]);
export const spendingClassSchema = z.enum(["essential", "commitment", "growth", "flexible", "avoidable"]);

// Icons are a single emoji (a few code points once variation selectors and
// ZWJ sequences are counted). Colors must be hex: CategoryIcon interpolates
// the stored value straight into a CSS color-mix(), and anything the browser
// can't parse renders as no color at all rather than failing loudly.
const lookupIconSchema = z.string().trim().min(1).max(8);
const hexColorSchema = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value like #10b981");

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  icon: lookupIconSchema.nullable().default(null),
  color: hexColorSchema.nullable().default(null),
  type: categoryTypeSchema.default("expense"),
  spendingClass: spendingClassSchema.nullable().default(null),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(40).optional(),
    icon: lookupIconSchema.nullable().optional(),
    color: hexColorSchema.nullable().optional(),
    type: categoryTypeSchema.optional(),
    spendingClass: spendingClassSchema.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const createPaymentMethodSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  icon: lookupIconSchema.nullable().default(null),
});
export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;

export const updatePaymentMethodSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(40).optional(),
    icon: lookupIconSchema.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;
