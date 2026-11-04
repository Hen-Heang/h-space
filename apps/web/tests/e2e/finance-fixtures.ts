// Synthetic /api/finance/* responses for the UI route sweep. Fictional amounts
// and names only — never real finance records. Shapes follow types/finance.ts.
import type {
  AnalyticsSummary,
  BudgetPerformance,
  CategoryAmount,
  FinanceOverviewSummary,
  FinancePreferences,
  MonthTotals,
  ReviewSummary,
  Transaction,
} from "../../types/finance"

const pad = (n: number) => String(n).padStart(2, "0")

function monthOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

const totals = (income: number, expense: number, count: number): MonthTotals => ({
  totalIncomeKrw: income,
  totalExpenseKrw: expense,
  netCashFlowKrw: income - expense,
  savingsRatePct: income > 0 ? Math.round(((income - expense) / income) * 1000) / 10 : 0,
  transactionCount: count,
  incomeTransactionCount: 2,
  expenseTransactionCount: count - 2,
})

const categories: CategoryAmount[] = [
  {
    categoryId: "c-food",
    categoryName: "Food & dining",
    categoryIcon: null,
    categoryColor: "#eb6834",
    spendingClass: "essential",
    amountKrw: 612000,
  },
  {
    categoryId: "c-rent",
    categoryName: "Housing",
    categoryIcon: null,
    categoryColor: "#2a78d6",
    spendingClass: "essential",
    amountKrw: 850000,
  },
  {
    categoryId: "c-transit",
    categoryName: "Transport",
    categoryIcon: null,
    categoryColor: "#1baf7a",
    spendingClass: "essential",
    amountKrw: 98000,
  },
  {
    categoryId: "c-fun",
    categoryName: "Entertainment and weekend outings",
    categoryIcon: null,
    categoryColor: "#e87ba4",
    spendingClass: "flexible",
    amountKrw: 143500,
  },
  {
    categoryId: "c-books",
    categoryName: "Books",
    categoryIcon: null,
    categoryColor: "#008300",
    spendingClass: "growth",
    amountKrw: 54000,
  },
]

const performance: BudgetPerformance[] = [
  {
    categoryId: "c-food",
    categoryName: "Food & dining",
    categoryIcon: null,
    categoryColor: "#eb6834",
    budgetKrw: 600000,
    spentKrw: 612000,
    remainingKrw: -12000,
    usagePct: 102,
    overBudget: true,
    status: "exceeded",
  },
  {
    categoryId: "c-transit",
    categoryName: "Transport",
    categoryIcon: null,
    categoryColor: "#1baf7a",
    budgetKrw: 120000,
    spentKrw: 98000,
    remainingKrw: 22000,
    usagePct: 82,
    overBudget: false,
    status: "watch",
  },
  {
    categoryId: "c-fun",
    categoryName: "Entertainment and weekend outings",
    categoryIcon: null,
    categoryColor: "#e87ba4",
    budgetKrw: 300000,
    spentKrw: 143500,
    remainingKrw: 156500,
    usagePct: 48,
    overBudget: false,
    status: "ok",
  },
]

function transactions(month: string): Transaction[] {
  const rows: Array<[number, "income" | "expense", string, string, number, "KRW" | "USD"]> = [
    [2, "income", "c-salary", "Monthly salary — synthetic employer", 3200000, "KRW"],
    [3, "expense", "c-rent", "Rent", 850000, "KRW"],
    [
      5,
      "expense",
      "c-food",
      "Groceries at a very long store name that should truncate",
      84300,
      "KRW",
    ],
    [7, "expense", "c-books", "Online course", 54000, "USD"],
    [8, "expense", "c-transit", "Transit card top-up", 50000, "KRW"],
    [9, "expense", "c-fun", "Cinema", 28000, "KRW"],
    [10, "income", "c-salary", "Side project payment", 400000, "KRW"],
  ]
  return rows.map(([day, type, categoryId, description, amountKrw, currency], i) => {
    const date = `${month}-${pad(day)}`
    const category = categories.find((c) => c.categoryId === categoryId)
    return {
      id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      date,
      type,
      categoryId,
      categoryName: category?.categoryName ?? "Salary",
      categoryIcon: null,
      categoryColor: category?.categoryColor ?? "#047857",
      description,
      amountKrw,
      currency,
      originalAmount: currency === "USD" ? 39.5 : null,
      exchangeRate: currency === "USD" ? 1367.1 : null,
      paymentMethodId: "pm-card",
      paymentMethodName: "Debit card",
      note: null,
      createdAt: `${date}T09:00:00.000Z`,
      updatedAt: `${date}T09:00:00.000Z`,
    }
  })
}

function overview(month: string): FinanceOverviewSummary {
  const monthTotals = totals(3600000, 1757500, 9)
  return {
    month,
    totals: monthTotals,
    savingsHealth: { targetRatePct: 20, deltaPct: 31.2, status: "above" },
    budgetHealth: {
      totalBudgetKrw: 1020000,
      totalSpentKrw: 853500,
      remainingKrw: 166500,
      usagePct: 84,
      status: "watch",
      attentionCount: 2,
    },
    financialHealth: {
      month,
      essential: {
        bucket: "essential",
        amountKrw: 1560000,
        percentageOfIncome: 43,
        targetPercentage: 50,
        direction: "maximum",
        status: "healthy",
      },
      lifestyle: {
        bucket: "lifestyle",
        amountKrw: 143500,
        percentageOfIncome: 4,
        targetPercentage: 30,
        direction: "maximum",
        status: "healthy",
      },
      future: {
        bucket: "future",
        amountKrw: 54000,
        percentageOfIncome: 1.5,
        targetPercentage: 20,
        direction: "minimum",
        status: "below",
      },
      futureBreakdown: { growthCategoryKrw: 54000, contributionsKrw: 0 },
      unclassifiedKrw: 0,
      totalIncomeKrw: 3600000,
      totalExpenseKrw: 1757500,
      availableKrw: 1842500,
      moneyRule: { essentialPct: 50, lifestylePct: 30, futurePct: 20 },
      overallStatus: "watch",
      recommendations: ["Move part of what's left this month into savings."],
    },
    categories,
    dailySpending: Array.from({ length: 10 }, (_, i) => ({
      date: `${month}-${pad(i + 1)}`,
      amountKrw: (i % 4) * 42000,
    })),
    dailyBudget: {
      totalBudgetKrw: 1020000,
      spentTodayKrw: 28000,
      availablePerDayKrw: 8325,
      monthlyRemainingKrw: 166500,
      daysRemaining: 20,
      status: "watch",
    },
    budgetPerformance: performance,
    recentTransactions: transactions(month).slice(0, 5),
  }
}

function analytics(month: string, previousMonth: string): AnalyticsSummary {
  return {
    month,
    totals: totals(3600000, 1757500, 9),
    previousMonth,
    previousTotals: totals(3200000, 1910000, 11),
    categories,
    paymentMethods: [
      { paymentMethodId: "pm-card", paymentMethodName: "Debit card", amountKrw: 1210000 },
      { paymentMethodId: "pm-cash", paymentMethodName: "Cash", amountKrw: 347500 },
      { paymentMethodId: null, paymentMethodName: "Unspecified", amountKrw: 200000 },
    ],
    dailyTrend: Array.from({ length: 10 }, (_, i) => ({
      date: `${month}-${pad(i + 1)}`,
      incomeKrw: i === 1 ? 3200000 : 0,
      expenseKrw: (i % 3) * 61000,
    })),
  }
}

function review(month: string): ReviewSummary {
  const [y, m] = month.split("-").map(Number) as [number, number]
  const planMonth = monthOf(new Date(y, m, 1))
  return {
    month,
    totals: totals(3600000, 1757500, 9),
    previousTotals: totals(3200000, 1910000, 11),
    categoryComparison: categories.map((c, i) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      currentKrw: c.amountKrw,
      previousKrw: c.amountKrw + (i % 2 === 0 ? 40000 : -25000),
      deltaKrw: i % 2 === 0 ? -40000 : 25000,
    })),
    budgetPerformance: performance,
    subscriptionsMonthlyKrw: 22050,
    savingsProgress: {
      totalSavedUsd: 4870.5,
      totalTargetUsd: 8000,
      overallPct: 61,
      goalsCount: 3,
      goalsReachedCount: 1,
    },
    observations: [
      { id: "o1", tone: "positive", text: "You spent less than last month." },
      { id: "o2", tone: "warning", text: "Food & dining went over its budget." },
      { id: "o3", tone: "neutral", text: "Three subscriptions renew next month." },
    ],
    nextMonthPlan: {
      planMonth,
      monthsAnalyzed: [month],
      recommendations: performance.map((p) => ({
        categoryId: p.categoryId,
        categoryName: p.categoryName,
        categoryIcon: null,
        categoryColor: p.categoryColor,
        spendingClass: "essential",
        currentBudgetKrw: p.budgetKrw,
        averageKrw: p.spentKrw,
        medianKrw: p.spentKrw,
        recommendedBudgetKrw: Math.round(p.spentKrw / 10000) * 10000,
        reason: p.overBudget ? "raise_unrealistic" : "hold_steady",
        rationale: p.overBudget
          ? "You've spent more than this budget for a while, so it's raised to something you can keep."
          : "Spending is steady and within budget.",
      })),
      totalRecommendedKrw: 870000,
      otherSpendingKrw: 904000,
      averageIncomeKrw: 3400000,
      projectedSavingsRatePct: 48,
      targetSavingsRatePct: 20,
      additionalTrimNeededKrw: 0,
    },
  }
}

const preferences: FinancePreferences = {
  monthlySpendingLimitKrw: 2000000,
  targetSavingsRate: 20,
  essentialTargetPct: 50,
  budgetWatchThresholdPct: 75,
  budgetNearLimitThresholdPct: 90,
  monthlyReviewEnabled: true,
  financeReportEmail: null,
  weeklyReportEmailEnabled: false,
  monthlyReportEmailEnabled: false,
}

/** The `data` payload for a GET to /api/finance/<path>, or undefined. */
export function financeFixture(url: URL): unknown {
  const now = new Date()
  const month = url.searchParams.get("month") ?? monthOf(now)
  const previous = monthOf(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const path = url.pathname.replace(/^\/api\/finance\/?/, "")

  switch (path) {
    case "overview":
      return overview(month)
    case "analytics":
      return analytics(month, previous)
    case "transactions":
      return {
        transactions: transactions((url.searchParams.get("start") ?? `${month}-01`).slice(0, 7)),
        hasMore: false,
      }
    case "transactions/suggestions":
      return []
    case "categories":
      return [
        ...categories.map(({ categoryId, categoryName, categoryColor, spendingClass }) => ({
          id: categoryId,
          name: categoryName,
          icon: null,
          color: categoryColor,
          type: "expense",
          spendingClass,
        })),
        {
          id: "c-salary",
          name: "Salary",
          icon: null,
          color: "#047857",
          type: "income",
          spendingClass: null,
        },
      ]
    case "payment-methods":
      return [
        { id: "pm-card", name: "Debit card", icon: null },
        { id: "pm-cash", name: "Cash", icon: null },
      ]
    case "budgets":
      return {
        categories: categories.map(
          ({ categoryId, categoryName, categoryColor, spendingClass }) => ({
            id: categoryId,
            name: categoryName,
            icon: null,
            color: categoryColor,
            type: "expense",
            spendingClass,
          }),
        ),
        budgets: performance.map(({ categoryId, categoryName, categoryColor, budgetKrw }) => ({
          categoryId,
          categoryName,
          categoryIcon: null,
          categoryColor,
          amountKrw: budgetKrw,
        })),
        spendByCategory: Object.fromEntries(categories.map((c) => [c.categoryId, c.amountKrw])),
        performance,
      }
    case "savings":
      return [
        {
          id: "00000000-0000-4000-8000-0000000000a1",
          name: "Emergency fund",
          icon: "💰",
          color: "#047857",
          targetUsd: 5000,
          currentUsd: 3250,
          deadline: null,
          note: null,
          purpose: "emergency_fund",
          createdAt: `${month}-01T00:00:00.000Z`,
          updatedAt: `${month}-01T00:00:00.000Z`,
        },
        {
          id: "00000000-0000-4000-8000-0000000000a2",
          name: "A very long trip name to Jeju Island next spring",
          icon: "✈️",
          color: "#2a78d6",
          targetUsd: 1800,
          currentUsd: 420.5,
          deadline: `${Number(month.slice(0, 4)) + 1}-04-01`,
          note: "Flights and two nights",
          purpose: "sinking_fund",
          createdAt: `${month}-01T00:00:00.000Z`,
          updatedAt: `${month}-01T00:00:00.000Z`,
        },
        {
          id: "00000000-0000-4000-8000-0000000000a3",
          name: "New laptop",
          icon: "💻",
          color: "#eb6834",
          targetUsd: 1200,
          currentUsd: 1200,
          deadline: null,
          note: null,
          purpose: "goal",
          createdAt: `${month}-01T00:00:00.000Z`,
          updatedAt: `${month}-01T00:00:00.000Z`,
        },
      ]
    case "subscriptions":
      return [
        {
          key: "streaming",
          name: "Video streaming",
          categoryName: "Entertainment and weekend outings",
          categoryIcon: null,
          categoryColor: "#e87ba4",
          latestAmountKrw: 17000,
          averageAmountKrw: 17000,
          occurrenceCount: 6,
          lastPaymentDate: `${month}-03`,
          frequency: "monthly",
          estimatedYearlyCostKrw: 204000,
          status: "keep",
        },
        {
          key: "cloud storage",
          name: "Cloud storage with a very long merchant name that should truncate",
          categoryName: "Books",
          categoryIcon: null,
          categoryColor: "#008300",
          latestAmountKrw: 3300,
          averageAmountKrw: 3300,
          occurrenceCount: 4,
          lastPaymentDate: `${month}-07`,
          frequency: "monthly",
          estimatedYearlyCostKrw: 39600,
          status: "review",
        },
        {
          key: "domain",
          name: "Domain renewal",
          categoryName: null,
          categoryIcon: null,
          categoryColor: null,
          latestAmountKrw: 21000,
          averageAmountKrw: 21000,
          occurrenceCount: 2,
          lastPaymentDate: `${month}-01`,
          frequency: "yearly",
          estimatedYearlyCostKrw: 21000,
          status: "plan_to_cancel",
        },
      ]
    case "merchant-names":
      return {
        merges: [
          {
            name: "Corner cafe",
            variants: [
              { key: "corner cafe", sample: "Corner cafe" },
              { key: "corner cafe 2", sample: "CORNER CAFE #2" },
            ],
          },
        ],
        suggestions: [
          {
            id: "s1",
            suggestedName: "Transit card",
            members: [
              { key: "transit card", sample: "Transit card top-up", count: 3, totalKrw: 150000 },
              { key: "transit top up", sample: "TRANSIT TOP UP", count: 2, totalKrw: 80000 },
            ],
            occurrenceCount: 5,
            totalKrw: 230000,
          },
        ],
      }
    case "review":
      return review(month)
    case "reports/weekly": {
      const r = review(month)
      return {
        weekStart: `${month}-02`,
        weekEnd: `${month}-08`,
        incomeKrw: 3200000,
        expenseKrw: 1056300,
        netCashFlowKrw: 2143700,
        previousWeekExpenseKrw: 980000,
        expenseChangePct: 7.8,
        topCategories: categories.slice(0, 3).map((c) => ({
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          amountKrw: c.amountKrw,
          pctOfTotal: 30,
        })),
        budgetWarnings: performance.filter((p) => p.status !== "ok"),
        savingsProgress: r.savingsProgress,
        subscriptionsMonthlyKrw: r.subscriptionsMonthlyKrw,
      }
    }
    case "reports/monthly": {
      const r = review(month)
      return {
        month,
        totals: r.totals,
        previousTotals: r.previousTotals,
        topCategories: categories.slice(0, 5).map((c) => ({
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          amountKrw: c.amountKrw,
          pctOfTotal: 20,
        })),
        categoryComparison: r.categoryComparison,
        budgetPerformance: r.budgetPerformance,
        subscriptionsMonthlyKrw: r.subscriptionsMonthlyKrw,
        savingsProgress: r.savingsProgress,
        observations: r.observations,
      }
    }
    case "email/status":
      return { configured: false, recipientEmail: "owner@example.invalid" }
    case "templates":
    case "recurring":
      return []
    case "preferences":
      return preferences
    case "exchange-rate":
      return { rate: 1367.1, fetchedAt: `${month}-01T00:00:00.000Z`, cached: true, fallback: false }
    default:
      // /savings/<id>/contributions
      if (/^savings\/[^/]+\/contributions$/.test(path)) {
        const goalId = path.split("/")[1]!
        return [
          {
            id: "00000000-0000-4000-8000-0000000000c1",
            goalId,
            amountUsd: 250,
            contributionMonth: month,
            createdAt: `${month}-02T00:00:00.000Z`,
          },
          {
            id: "00000000-0000-4000-8000-0000000000c2",
            goalId,
            amountUsd: 170.5,
            contributionMonth: month,
            createdAt: `${month}-01T00:00:00.000Z`,
          },
        ]
      }
      return undefined
  }
}
