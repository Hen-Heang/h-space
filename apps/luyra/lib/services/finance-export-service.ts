import "server-only";
import { findAllTransactionsForExport } from "@/lib/repositories/finance-transaction-repository";
import type { Transaction, TransactionExportRow } from "@/types/finance";

function toExportRow(transaction: Transaction): TransactionExportRow {
  return {
    date: transaction.date,
    type: transaction.type,
    description: transaction.description,
    amountKrw: transaction.amountKrw,
    currency: transaction.currency,
    originalAmount: transaction.originalAmount,
    exchangeRate: transaction.exchangeRate,
    categoryName: transaction.categoryName,
    paymentMethodName: transaction.paymentMethodName,
    note: transaction.note,
  };
}

export async function exportTransactions(userId: string): Promise<TransactionExportRow[]> {
  const transactions = await findAllTransactionsForExport(userId);
  return transactions.map(toExportRow);
}
