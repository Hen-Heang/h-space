// Display-only helpers for the Transactions page
// (components/finance/transactions). Nothing here calculates money: amounts
// arrive already converted (amountKrw is canonical) and day totals are plain
// sums of those values, exactly as the list computed them before. These turn
// transactions and filter state into groups, headings and labels so the
// components stay presentational and the wording is tested in one place.
import { krw, usd } from "@/lib/finance-format"
import type { Category, PaymentMethod, Transaction, TransactionType } from "@/types/finance"

export interface TransactionDayGroup {
  date: string
  items: Transaction[]
  incomeKrw: number
  expenseKrw: number
}

/**
 * Groups by `date`, in order of each date's first appearance, so the list's
 * sort (newest, oldest, by amount) decides the group order.
 */
export function groupTransactionsByDate(transactions: Transaction[]): TransactionDayGroup[] {
  const groups = new Map<string, TransactionDayGroup>()
  for (const transaction of transactions) {
    let group = groups.get(transaction.date)
    if (!group) {
      group = { date: transaction.date, items: [], incomeKrw: 0, expenseKrw: 0 }
      groups.set(transaction.date, group)
    }
    group.items.push(transaction)
    if (transaction.type === "income") group.incomeKrw += transaction.amountKrw
    else group.expenseKrw += transaction.amountKrw
  }
  return [...groups.values()]
}

function localDateKey(date: Date): string {
  return date.toLocaleDateString("en-CA")
}

/** "Today", "Yesterday", otherwise "Wednesday, Nov 5". */
export function dayHeading(date: string, now: Date = new Date()): string {
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date === localDateKey(now)) return "Today"
  if (date === localDateKey(yesterday)) return "Yesterday"
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
}

/** The category line under a row's title; income with no category reads "Income". */
export function transactionCategoryLabel(
  transaction: Pick<Transaction, "type" | "categoryName">,
): string {
  return transaction.categoryName || (transaction.type === "income" ? "Income" : "Uncategorized")
}

/** "3:12 PM" from the record's creation time; null when it can't be read. */
export function transactionTime(createdAt: string): string | null {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

/**
 * The secondary facts a row no longer prints inline — payment method, USD
 * original and rate, note, time added — for the row's details menu. Only the
 * facts the record actually has are returned.
 */
export function transactionDetails(
  transaction: Pick<
    Transaction,
    "paymentMethodName" | "currency" | "originalAmount" | "exchangeRate" | "note" | "createdAt"
  >,
): { label: string; value: string }[] {
  const details: { label: string; value: string }[] = []
  if (transaction.paymentMethodName) {
    details.push({ label: "Paid with", value: transaction.paymentMethodName })
  }
  if (transaction.currency === "USD" && transaction.originalAmount !== null) {
    details.push({
      label: "Entered as",
      value:
        transaction.exchangeRate !== null
          ? `${usd.format(transaction.originalAmount)} at ${krw.format(transaction.exchangeRate)} per $1`
          : usd.format(transaction.originalAmount),
    })
  }
  const note = transaction.note?.trim()
  if (note) details.push({ label: "Note", value: note })
  const time = transactionTime(transaction.createdAt)
  if (time) details.push({ label: "Added", value: time })
  return details
}

export interface TransactionFilterState {
  type: TransactionType | undefined
  categoryId: string
  paymentMethodId: string
  amountMin: number | undefined
  amountMax: number | undefined
}

/** How many filters narrow the list. Search and sort are not counted. */
export function activeFilterCount(filters: TransactionFilterState): number {
  return [
    filters.type !== undefined,
    filters.categoryId !== "",
    filters.paymentMethodId !== "",
    filters.amountMin !== undefined,
    filters.amountMax !== undefined,
  ].filter(Boolean).length
}

/**
 * Plain-language pieces of the active filters ("Expense", "Groceries",
 * "₩10,000 to ₩50,000"), shown beside the Filters control while its panel
 * is closed so a narrowed list never looks like missing data.
 */
export function activeFilterSummary(
  filters: TransactionFilterState,
  categories: Pick<Category, "id" | "name">[],
  paymentMethods: Pick<PaymentMethod, "id" | "name">[],
): string[] {
  const parts: string[] = []
  if (filters.type) parts.push(filters.type === "income" ? "Income" : "Expense")
  if (filters.categoryId) {
    parts.push(categories.find((c) => c.id === filters.categoryId)?.name ?? "1 category")
  }
  if (filters.paymentMethodId) {
    parts.push(
      paymentMethods.find((m) => m.id === filters.paymentMethodId)?.name ?? "1 payment method",
    )
  }
  const { amountMin: min, amountMax: max } = filters
  if (min !== undefined && max !== undefined) {
    parts.push(`${krw.format(min)} to ${krw.format(max)}`)
  } else if (min !== undefined) {
    parts.push(`${krw.format(min)} or more`)
  } else if (max !== undefined) {
    parts.push(`Up to ${krw.format(max)}`)
  }
  return parts
}
