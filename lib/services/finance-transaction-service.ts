import "server-only";
import { Errors } from "@/lib/errors";
import { findCategoryById } from "@/lib/repositories/finance-lookup-repository";
import {
  createTransaction as createTransactionRepo,
  deleteTransaction as deleteTransactionRepo,
  deleteTransactionsByIds,
  findDescriptionSuggestions,
  findTransactionsByUser,
  findTransactionTypesByIds,
  setCategoryForTransactions,
  updateTransaction as updateTransactionRepo,
  type DescriptionSuggestionRow,
  type ResolvedTransactionInput,
  type TransactionQuery,
} from "@/lib/repositories/finance-transaction-repository";
import type { BulkTransactionActionInput, CreateTransactionInput, UpdateTransactionInput } from "@/lib/validation/finance";
import type { Transaction, TransactionType } from "@/types/finance";

// The one place amountKrw is computed for a foreign-currency entry — never
// trust a client-sent KRW figure for a USD transaction, and always round to
// the nearest whole won (KRW has no minor unit).
function resolveAmounts(input: CreateTransactionInput): { amountKrw: number; originalAmount: number | null; exchangeRate: number | null } {
  if (input.currency === "USD") {
    const originalAmount = input.originalAmount as number;
    const exchangeRate = input.exchangeRate as number;
    return { amountKrw: Math.round(originalAmount * exchangeRate), originalAmount, exchangeRate };
  }
  return { amountKrw: input.amountKrw as number, originalAmount: null, exchangeRate: null };
}

function toResolvedInput(input: CreateTransactionInput | UpdateTransactionInput): ResolvedTransactionInput {
  return { ...input, ...resolveAmounts(input) };
}

export async function listTransactions(
  userId: string,
  query: TransactionQuery
): Promise<{ transactions: Transaction[]; hasMore: boolean }> {
  return findTransactionsByUser(userId, query);
}

export async function addTransaction(userId: string, input: CreateTransactionInput): Promise<Transaction> {
  return createTransactionRepo(userId, toResolvedInput(input));
}

export async function editTransaction(userId: string, id: string, input: UpdateTransactionInput): Promise<Transaction> {
  const transaction = await updateTransactionRepo(id, userId, toResolvedInput(input));
  if (!transaction) throw Errors.notFound("Transaction");
  return transaction;
}

export async function removeTransaction(userId: string, id: string): Promise<void> {
  const deleted = await deleteTransactionRepo(id, userId);
  if (!deleted) throw Errors.notFound("Transaction");
}

/**
 * Bulk delete or recategorize. Recategorizing checks the category is the
 * user's own and fits every selected row — an expense-only category can't be
 * put on income — so a bulk edit can't create a row the single-edit sheet
 * would have refused. Returns how many rows changed.
 */
export async function applyBulkTransactionAction(
  userId: string,
  input: BulkTransactionActionInput
): Promise<{ affected: number }> {
  if (input.action === "delete") {
    return { affected: await deleteTransactionsByIds(userId, input.ids) };
  }

  if (input.categoryId !== null) {
    const category = await findCategoryById(input.categoryId, userId);
    if (!category) throw Errors.notFound("Category");
    if (category.type !== "both") {
      const types = await findTransactionTypesByIds(userId, input.ids);
      if (types.some((type) => type !== category.type)) {
        throw Errors.validation(
          `${category.name} is an ${category.type} category, but the selection includes ${category.type === "expense" ? "income" : "expenses"}.`
        );
      }
    }
  }

  return { affected: await setCategoryForTransactions(userId, input.ids, input.categoryId) };
}

const SUGGESTION_LIMIT = 6;

export async function suggestDescriptions(
  userId: string,
  query: string,
  type?: TransactionType
): Promise<DescriptionSuggestionRow[]> {
  return findDescriptionSuggestions(userId, query, type, SUGGESTION_LIMIT);
}
