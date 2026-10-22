export type TransactionType = "income" | "expense";
export type CategoryType = "income" | "expense" | "both";
export type SubscriptionStatus = "keep" | "review" | "plan_to_cancel" | "cancelled";
// finance_categories.spending_class — how a category behaves for the
// Financial Health 3-bucket model (see lib/finance/spending-class.ts).
// `commitment` is contextual: a recurring/fixed obligation that lands in
// Essentials or Lifestyle depending on the category's own semantics.
export type SpendingClass = "essential" | "commitment" | "growth" | "flexible" | "avoidable";
// finance_savings_goals.purpose — what a savings goal is protecting or
// building toward. Purely descriptive; it does not change how a goal is
// tracked (still USD target/current + contributions).
export type SavingsGoalPurpose = "emergency_fund" | "sinking_fund" | "goal" | "investment" | "other";
// KRW is the canonical accounting currency everywhere in Finance — every sum,
// budget, and analytic is KRW. USD is the one supported original currency a
// transaction can be entered in; amountKrw is always populated regardless.
export type Currency = "KRW" | "USD";

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: CategoryType;
  spendingClass: SpendingClass | null;
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string | null;
}

// How many rows still reference a category or payment method, broken down by
// table so a blocked delete can say what is holding it rather than just "in
// use". `budgets` is always 0 for payment methods — see countPaymentMethodUsage.
export interface LookupUsage {
  transactions: number;
  budgets: number;
  templates: number;
  recurring: number;
  total: number;
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  description: string;
  amountKrw: number;
  currency: Currency;
  originalAmount: number | null;
  exchangeRate: number | null;
  paymentMethodId: string | null;
  paymentMethodName: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

/** A rule that creates a transaction on a schedule (salary, rent, a subscription). */
export interface RecurringRule {
  id: string;
  type: TransactionType;
  description: string;
  currency: Currency;
  /** KRW amount; for a USD rule, an estimate at the rate when it was saved. */
  amountKrw: number;
  /** USD amount for a USD rule; converted at that day's rate when applied. */
  originalAmount: number | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  paymentMethodId: string | null;
  paymentMethodName: string | null;
  note: string | null;
  frequency: RecurringFrequency;
  /** Day of month a monthly/yearly rule lands on (clamped to short months). */
  anchorDay: number;
  /** YYYY-MM-DD of the next occurrence still to be created. */
  nextDate: string;
  lastApplied: string | null;
  isActive: boolean;
  createdAt: string;
}

// The shape exported over CSV/JSON — deliberately trimmed of internal ids,
// icon/color metadata, and timestamps that don't belong in a data export.
export interface TransactionExportRow {
  date: string;
  type: TransactionType;
  description: string;
  amountKrw: number;
  currency: Currency;
  originalAmount: number | null;
  exchangeRate: number | null;
  categoryName: string | null;
  paymentMethodName: string | null;
  note: string | null;
}

export interface TransactionTemplate {
  id: string;
  type: TransactionType;
  description: string;
  amountKrw: number;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  paymentMethodId: string | null;
  paymentMethodName: string | null;
  note: string | null;
  createdAt: string;
}

export interface Budget {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  amountKrw: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetUsd: number;
  currentUsd: number;
  deadline: string | null;
  note: string | null;
  purpose: SavingsGoalPurpose | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsContribution {
  id: string;
  goalId: string;
  amountUsd: number;
  contributionMonth: string;
  createdAt: string;
}

export interface DetectedSubscription {
  key: string;
  name: string;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  latestAmountKrw: number;
  averageAmountKrw: number;
  occurrenceCount: number;
  lastPaymentDate: string;
  frequency: "monthly" | "yearly" | "irregular";
  estimatedYearlyCostKrw: number;
  status: SubscriptionStatus;
}

export interface FinancePreferences {
  monthlySpendingLimitKrw: number | null;
  targetSavingsRate: number;
  // Essentials' max-guideline percentage of income. Lifestyle's guideline is
  // never stored — it's always the remainder: 100 - essentialTargetPct -
  // targetSavingsRate. That keeps the money rule single-sourced instead of
  // three independently-editable numbers that could drift from summing to 100.
  essentialTargetPct: number;
  budgetWatchThresholdPct: number;
  budgetNearLimitThresholdPct: number;
  monthlyReviewEnabled: boolean;
  financeReportEmail: string | null;
  weeklyReportEmailEnabled: boolean;
  monthlyReportEmailEnabled: boolean;
}

export interface MonthTotals {
  totalIncomeKrw: number;
  totalExpenseKrw: number;
  netCashFlowKrw: number;
  savingsRatePct: number;
  transactionCount: number;
  incomeTransactionCount: number;
  expenseTransactionCount: number;
}

export interface CategoryAmount {
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  spendingClass: SpendingClass | null;
  amountKrw: number;
}

export interface CategoryComparison {
  categoryId: string | null;
  categoryName: string;
  currentKrw: number;
  previousKrw: number;
  deltaKrw: number;
}

export interface BudgetPerformance {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  budgetKrw: number;
  spentKrw: number;
  remainingKrw: number;
  usagePct: number;
  overBudget: boolean;
  status: "ok" | "watch" | "near_limit" | "exceeded";
}

export interface PaymentMethodAmount {
  paymentMethodId: string | null;
  paymentMethodName: string;
  amountKrw: number;
}

export interface DailyFlowPoint {
  date: string;
  incomeKrw: number;
  expenseKrw: number;
}

export interface AnalyticsSummary {
  month: string;
  totals: MonthTotals;
  previousMonth: string;
  previousTotals: MonthTotals;
  categories: CategoryAmount[];
  paymentMethods: PaymentMethodAmount[];
  dailyTrend: DailyFlowPoint[];
}

export interface DailySpendingPoint {
  date: string;
  amountKrw: number;
}

export interface DailyBudgetGuide {
  totalBudgetKrw: number;
  spentTodayKrw: number;
  availablePerDayKrw: number;
  monthlyRemainingKrw: number;
  daysRemaining: number;
  status: "healthy" | "watch" | "over";
}

export interface SavingsRateHealth {
  targetRatePct: number;
  deltaPct: number | null;
  status: "unavailable" | "above" | "on_target" | "below";
}

export interface BudgetHealth {
  totalBudgetKrw: number;
  totalSpentKrw: number;
  remainingKrw: number;
  usagePct: number;
  status: BudgetPerformance["status"];
  attentionCount: number;
}

// The 50/30/20-style money rule: Essentials and Lifestyle are MAXIMUM
// guidelines, Future is a MINIMUM. lifestylePct is always the remainder
// (100 - essentialPct - futurePct) — see FinancePreferences.essentialTargetPct.
export interface MoneyRule {
  essentialPct: number;
  lifestylePct: number;
  futurePct: number;
}

export type FinanceBucket = "essential" | "lifestyle" | "future";

export interface FinanceBucketHealth {
  bucket: FinanceBucket;
  amountKrw: number;
  // null when income is 0 for the month — never divide by zero, surface
  // "unavailable" instead (see FinanceBucketHealth.status).
  percentageOfIncome: number | null;
  targetPercentage: number;
  // "maximum" for Essentials/Lifestyle (stay at or under target), "minimum"
  // for Future (stay at or above target). Drives which side of the target a
  // "watch" or "over/below" status falls on.
  direction: "maximum" | "minimum";
  status: "healthy" | "watch" | "over" | "below" | "unavailable";
}

// Deterministic aggregate answering "is my money healthy this month?" —
// computed once server-side in lib/finance/financial-health.ts and attached
// to FinanceOverviewSummary. Never recomputed client-side.
//
// This is distinct from MonthTotals.savingsRatePct: savingsRatePct is
// "income minus expenses, as a percent of income" (what's left over).
// future.percentageOfIncome is "spending in growth-classified categories,
// as a percent of income" (money intentionally directed at the future). A
// user can have income left over that isn't in a `growth` category yet — the
// two numbers are related but must never be treated as the same value.
export interface FinancialHealthSummary {
  month: string;
  essential: FinanceBucketHealth;
  lifestyle: FinanceBucketHealth;
  future: FinanceBucketHealth;
  // future.amountKrw split into its two independently-recorded sources — see
  // computeFinancialHealth's double-counting note. growthCategoryKrw is
  // `growth`-classified expense spending (KRW); contributionsKrw is this
  // month's savings-goal contributions (USD, converted to KRW).
  futureBreakdown: { growthCategoryKrw: number; contributionsKrw: number };
  // Expense total from categories with no spending_class set yet — counted
  // in totalExpenseKrw but excluded from all three buckets above until the
  // user classifies them. Surfaced so /finance can prompt for classification
  // instead of silently under-representing a bucket.
  unclassifiedKrw: number;
  totalIncomeKrw: number;
  totalExpenseKrw: number;
  availableKrw: number;
  moneyRule: MoneyRule;
  overallStatus: "good" | "watch" | "attention" | "unavailable";
  // 1-3 short, deterministic, non-judgmental notes — see AGENTS.md's
  // Financial Health recommendations rule. Never sent to an LLM as a
  // question; an AI may only explain numbers already computed here.
  recommendations: string[];
}

export interface FinanceOverviewSummary {
  month: string;
  totals: MonthTotals;
  savingsHealth: SavingsRateHealth;
  budgetHealth: BudgetHealth | null;
  financialHealth: FinancialHealthSummary;
  categories: CategoryAmount[];
  dailySpending: DailySpendingPoint[];
  dailyBudget: DailyBudgetGuide | null;
  budgetPerformance: BudgetPerformance[];
  recentTransactions: Transaction[];
}

export interface ReviewObservation {
  id: string;
  tone: "positive" | "warning" | "neutral";
  text: string;
}

// Shared by Review and by the Weekly/Monthly reports — one savings-progress
// shape computed once in finance-savings-service.ts's computeSavingsProgress.
export interface SavingsProgress {
  totalSavedUsd: number;
  totalTargetUsd: number;
  overallPct: number;
  goalsCount: number;
  goalsReachedCount: number;
}

export interface ReviewSummary {
  month: string;
  totals: MonthTotals;
  previousTotals: MonthTotals;
  categoryComparison: CategoryComparison[];
  budgetPerformance: BudgetPerformance[];
  subscriptionsMonthlyKrw: number;
  savingsProgress: SavingsProgress;
  observations: ReviewObservation[];
}

export interface ReportCategoryAmount {
  categoryId: string | null;
  categoryName: string;
  amountKrw: number;
  pctOfTotal: number;
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  incomeKrw: number;
  expenseKrw: number;
  netCashFlowKrw: number;
  previousWeekExpenseKrw: number;
  expenseChangePct: number | null;
  topCategories: ReportCategoryAmount[];
  budgetWarnings: BudgetPerformance[];
  savingsProgress: SavingsProgress;
  subscriptionsMonthlyKrw: number;
}

export interface MonthlyReport {
  month: string;
  totals: MonthTotals;
  previousTotals: MonthTotals;
  topCategories: ReportCategoryAmount[];
  categoryComparison: CategoryComparison[];
  budgetPerformance: BudgetPerformance[];
  subscriptionsMonthlyKrw: number;
  savingsProgress: SavingsProgress;
  observations: ReviewObservation[];
}
