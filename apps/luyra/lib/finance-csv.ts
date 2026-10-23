import type { TransactionExportRow } from "@/types/finance";

const DANGEROUS_LEADING_CHAR = /^[=+\-@\t\r]/;

// Neutralizes spreadsheet formula injection: a cell starting with =, +, -, @,
// or a tab/CR is prefixed with a literal single quote, the Excel/Sheets
// convention that forces text interpretation instead of formula evaluation.
// Every cell is still fully quoted per RFC 4180 with internal quotes doubled,
// which also makes embedded commas/newlines safe.
export function csvCell(value: string): string {
  const safe = DANGEROUS_LEADING_CHAR.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

// Only free-text fields (description, category/payment-method name, note) go
// through csvCell — date/type/amount/currency/rate are numbers or controlled
// enum strings that can never start with a dangerous character.
export function buildTransactionsCsv(rows: TransactionExportRow[]): string {
  const headers = [
    "Date",
    "Type",
    "Description",
    "Amount (KRW)",
    "Currency",
    "Original Amount",
    "Exchange Rate",
    "Category",
    "Payment Method",
    "Note",
  ];

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.date,
        row.type,
        csvCell(row.description),
        String(row.amountKrw),
        row.currency,
        row.originalAmount !== null ? row.originalAmount.toFixed(2) : "",
        row.exchangeRate !== null ? String(row.exchangeRate) : "",
        csvCell(row.categoryName ?? ""),
        csvCell(row.paymentMethodName ?? ""),
        csvCell(row.note ?? ""),
      ].join(",")
    );
  }

  return lines.join("\r\n");
}
