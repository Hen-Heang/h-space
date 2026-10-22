import { apiFetch } from "@/lib/api/client";
import type {
  ApplyBudgetPlanInput,
  BulkTransactionActionInput,
  CreateCategoryInput,
  CreateContributionInput,
  CreatePaymentMethodInput,
  CreateSavingsGoalInput,
  CreateTransactionInput,
  CreateTransactionTemplateInput,
  MergeMerchantsInput,
  RecurringRuleInput,
  SetSubscriptionStatusInput,
  TransactionSort,
  UpdateCategoryInput,
  UpdatePaymentMethodInput,
  UpdatePreferencesInput,
  UpdateSavingsGoalInput,
  UpdateTransactionInput,
  UpsertBudgetInput,
} from "@/lib/validation/finance";
import type {
  AnalyticsSummary,
  Budget,
  BudgetPerformance,
  Category,
  DetectedSubscription,
  FinancePreferences,
  FinanceOverviewSummary,
  MonthlyReport,
  PaymentMethod,
  RecurringRule,
  ReviewSummary,
  SavingsContribution,
  SavingsGoal,
  Transaction,
  TransactionTemplate,
  TransactionType,
  WeeklySummary,
} from "@/types/finance";

export function listCategories(): Promise<Category[]> {
  return apiFetch<Category[]>("/api/finance/categories");
}

export function createCategory(input: CreateCategoryInput): Promise<Category> {
  return apiFetch<Category>("/api/finance/categories", { method: "POST", body: JSON.stringify(input) });
}

export function updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
  return apiFetch<Category>(`/api/finance/categories/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function deleteCategory(id: string): Promise<void> {
  await apiFetch<{ id: string }>(`/api/finance/categories/${id}`, { method: "DELETE" });
}

export function listPaymentMethods(): Promise<PaymentMethod[]> {
  return apiFetch<PaymentMethod[]>("/api/finance/payment-methods");
}

export function createPaymentMethod(input: CreatePaymentMethodInput): Promise<PaymentMethod> {
  return apiFetch<PaymentMethod>("/api/finance/payment-methods", { method: "POST", body: JSON.stringify(input) });
}

export function updatePaymentMethod(id: string, input: UpdatePaymentMethodInput): Promise<PaymentMethod> {
  return apiFetch<PaymentMethod>(`/api/finance/payment-methods/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deletePaymentMethod(id: string): Promise<void> {
  await apiFetch<{ id: string }>(`/api/finance/payment-methods/${id}`, { method: "DELETE" });
}

export function getExchangeRate(): Promise<{ rate: number; fetchedAt: string; cached: boolean; fallback: boolean }> {
  return apiFetch("/api/finance/exchange-rate");
}

export function listTransactions(params: {
  start: string;
  end: string;
  type?: TransactionType;
  categoryId?: string;
  paymentMethodId?: string;
  amountMin?: number;
  amountMax?: number;
  search?: string;
  sort?: TransactionSort;
  page?: number;
}): Promise<{ transactions: Transaction[]; hasMore: boolean }> {
  const query = new URLSearchParams({ start: params.start, end: params.end });
  if (params.type) query.set("type", params.type);
  if (params.categoryId) query.set("categoryId", params.categoryId);
  if (params.paymentMethodId) query.set("paymentMethodId", params.paymentMethodId);
  if (params.amountMin !== undefined) query.set("amountMin", String(params.amountMin));
  if (params.amountMax !== undefined) query.set("amountMax", String(params.amountMax));
  if (params.search) query.set("search", params.search);
  if (params.sort) query.set("sort", params.sort);
  if (params.page) query.set("page", String(params.page));
  return apiFetch(`/api/finance/transactions?${query.toString()}`);
}

export function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  return apiFetch<Transaction>("/api/finance/transactions", { method: "POST", body: JSON.stringify(input) });
}

export function updateTransaction(id: string, input: UpdateTransactionInput): Promise<Transaction> {
  return apiFetch<Transaction>(`/api/finance/transactions/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function deleteTransaction(id: string): Promise<void> {
  await apiFetch<{ id: string }>(`/api/finance/transactions/${id}`, { method: "DELETE" });
}

/** Bulk delete or recategorize; `affected` is how many rows actually changed. */
export function bulkTransactionAction(input: BulkTransactionActionInput): Promise<{ affected: number }> {
  return apiFetch("/api/finance/transactions/bulk", { method: "POST", body: JSON.stringify(input) });
}

export interface DescriptionSuggestion {
  description: string;
  type: TransactionType;
  categoryId: string | null;
  paymentMethodId: string | null;
  uses: number;
}

export function getDescriptionSuggestions(q: string, type?: TransactionType): Promise<DescriptionSuggestion[]> {
  const query = new URLSearchParams({ q });
  if (type) query.set("type", type);
  return apiFetch<DescriptionSuggestion[]>(`/api/finance/transactions/suggestions?${query.toString()}`);
}

export function listTemplates(): Promise<TransactionTemplate[]> {
  return apiFetch<TransactionTemplate[]>("/api/finance/templates");
}

export function createTemplate(input: CreateTransactionTemplateInput): Promise<TransactionTemplate> {
  return apiFetch<TransactionTemplate>("/api/finance/templates", { method: "POST", body: JSON.stringify(input) });
}

export async function deleteTemplate(id: string): Promise<void> {
  await apiFetch<{ id: string }>(`/api/finance/templates/${id}`, { method: "DELETE" });
}

export function listRecurringRules(): Promise<RecurringRule[]> {
  return apiFetch<RecurringRule[]>("/api/finance/recurring");
}

/** `appliedCount` is how many transactions saving the rule created right away (a next date of today or earlier). */
export function createRecurringRule(input: RecurringRuleInput): Promise<{ rule: RecurringRule; appliedCount: number }> {
  return apiFetch("/api/finance/recurring", { method: "POST", body: JSON.stringify(input) });
}

export function updateRecurringRule(
  id: string,
  input: RecurringRuleInput
): Promise<{ rule: RecurringRule; appliedCount: number }> {
  return apiFetch(`/api/finance/recurring/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export async function deleteRecurringRule(id: string): Promise<void> {
  await apiFetch<{ id: string }>(`/api/finance/recurring/${id}`, { method: "DELETE" });
}

export function listBudgets(
  start: string,
  end: string
): Promise<{
  categories: Category[];
  budgets: Budget[];
  spendByCategory: Record<string, number>;
  performance: BudgetPerformance[];
}> {
  const query = new URLSearchParams({ start, end });
  return apiFetch(`/api/finance/budgets?${query.toString()}`);
}

export async function upsertBudget(input: UpsertBudgetInput): Promise<void> {
  await apiFetch<{ categoryId: string }>("/api/finance/budgets", { method: "PUT", body: JSON.stringify(input) });
}

export async function deleteBudget(categoryId: string): Promise<void> {
  await apiFetch<{ categoryId: string }>(`/api/finance/budgets/${categoryId}`, { method: "DELETE" });
}

export function listSavingsGoals(): Promise<SavingsGoal[]> {
  return apiFetch<SavingsGoal[]>("/api/finance/savings");
}

export function createSavingsGoal(input: CreateSavingsGoalInput): Promise<SavingsGoal> {
  return apiFetch<SavingsGoal>("/api/finance/savings", { method: "POST", body: JSON.stringify(input) });
}

export function updateSavingsGoal(id: string, input: UpdateSavingsGoalInput): Promise<SavingsGoal> {
  return apiFetch<SavingsGoal>(`/api/finance/savings/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function deleteSavingsGoal(id: string): Promise<void> {
  await apiFetch<{ id: string }>(`/api/finance/savings/${id}`, { method: "DELETE" });
}

export function addSavingsContribution(goalId: string, input: CreateContributionInput): Promise<SavingsContribution> {
  return apiFetch<SavingsContribution>(`/api/finance/savings/${goalId}/contributions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listSavingsContributions(goalId: string): Promise<SavingsContribution[]> {
  return apiFetch<SavingsContribution[]>(`/api/finance/savings/${goalId}/contributions`);
}

export function listDetectedSubscriptions(): Promise<DetectedSubscription[]> {
  return apiFetch<DetectedSubscription[]>("/api/finance/subscriptions");
}

export interface MerchantMergeSuggestion {
  id: string;
  suggestedName: string;
  members: { key: string; sample: string; count: number; totalKrw: number }[];
  occurrenceCount: number;
  totalKrw: number;
}

export interface MerchantNames {
  merges: { name: string; variants: { key: string; sample: string }[] }[];
  suggestions: MerchantMergeSuggestion[];
}

export function getMerchantNames(): Promise<MerchantNames> {
  return apiFetch<MerchantNames>("/api/finance/merchant-names");
}

export function mergeMerchants(input: MergeMerchantsInput): Promise<{ merged: number }> {
  return apiFetch("/api/finance/merchant-names", { method: "POST", body: JSON.stringify(input) });
}

export async function unmergeMerchants(name: string): Promise<void> {
  await apiFetch<{ name: string }>("/api/finance/merchant-names", { method: "DELETE", body: JSON.stringify({ name }) });
}

export async function setSubscriptionStatus(key: string, input: SetSubscriptionStatusInput): Promise<void> {
  await apiFetch<{ key: string }>(`/api/finance/subscriptions/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function getPreferences(): Promise<FinancePreferences> {
  return apiFetch<FinancePreferences>("/api/finance/preferences");
}

export function updatePreferences(input: UpdatePreferencesInput): Promise<FinancePreferences> {
  return apiFetch<FinancePreferences>("/api/finance/preferences", { method: "PUT", body: JSON.stringify(input) });
}

export function getAnalyticsSummary(month: string): Promise<AnalyticsSummary> {
  return apiFetch<AnalyticsSummary>(`/api/finance/analytics?month=${month}`);
}

export function getFinanceOverview(month: string): Promise<FinanceOverviewSummary> {
  return apiFetch<FinanceOverviewSummary>(`/api/finance/overview?month=${month}`);
}

export function getReviewSummary(month: string): Promise<ReviewSummary> {
  return apiFetch<ReviewSummary>(`/api/finance/review?month=${month}`);
}

export function applyBudgetPlan(input: ApplyBudgetPlanInput): Promise<{ applied: number }> {
  return apiFetch<{ applied: number }>("/api/finance/review/plan", { method: "POST", body: JSON.stringify(input) });
}

export function getWeeklySummary(): Promise<WeeklySummary> {
  return apiFetch<WeeklySummary>("/api/finance/reports/weekly");
}

export function getMonthlyReport(month: string): Promise<MonthlyReport> {
  return apiFetch<MonthlyReport>(`/api/finance/reports/monthly?month=${month}`);
}

export interface MoneyCoachRecommendation {
  categoryId: string;
  categoryName: string;
  currentBudgetKrw: number;
  suggestedBudgetKrw: number;
  rationale: string;
}
export type MoneyCoachResult =
  | { ok: true; data: { summary: string; recommendation: MoneyCoachRecommendation | null } }
  | { ok: false; reason: "not_configured" | "request_failed" };

export function getMoneyCoachInsight(month: string): Promise<MoneyCoachResult> {
  return apiFetch<MoneyCoachResult>(`/api/finance/money-coach?month=${month}`);
}

export type TelegramSendResult = { sent: true } | { sent: false; reason: "not_configured" | "not_linked" | "send_failed" };

export function sendWeeklySummaryTelegram(): Promise<TelegramSendResult> {
  return apiFetch<TelegramSendResult>("/api/finance/telegram/send", { method: "POST", body: JSON.stringify({ type: "weekly" }) });
}

export function sendMonthlyReportTelegram(month: string, monthLabel: string): Promise<TelegramSendResult> {
  return apiFetch<TelegramSendResult>("/api/finance/telegram/send", {
    method: "POST",
    body: JSON.stringify({ type: "monthly", month, monthLabel }),
  });
}

export type EmailSendResult = { sent: true } | { sent: false; reason: "not_configured" | "no_recipient" | "send_failed" };

export function getEmailStatus(): Promise<{ configured: boolean; recipientEmail: string }> {
  return apiFetch("/api/finance/email/status");
}

export function sendWeeklySummaryEmail(): Promise<EmailSendResult> {
  return apiFetch<EmailSendResult>("/api/finance/email/send", { method: "POST", body: JSON.stringify({ type: "weekly" }) });
}

export function sendMonthlyReportEmail(month: string, monthLabel: string): Promise<EmailSendResult> {
  return apiFetch<EmailSendResult>("/api/finance/email/send", {
    method: "POST",
    body: JSON.stringify({ type: "monthly", month, monthLabel }),
  });
}
