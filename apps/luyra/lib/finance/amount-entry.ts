import type { Currency } from "@/types/finance";

const MAX_INTEGER_DIGITS = 12;

/** Chips that add to the amount — common bill sizes for each currency. */
export const QUICK_AMOUNTS: Record<Currency, number[]> = {
  KRW: [1_000, 5_000, 10_000, 50_000],
  USD: [1, 5, 10, 50],
};

/**
 * Reduces whatever was typed or pasted ("₩12,500", "12.5.0", "007") to a plain
 * number string: digits only for KRW, at most two decimals for USD.
 */
export function sanitizeAmount(input: string, currency: Currency): string {
  let value = input.replace(/[^\d.]/g, "");
  const dot = value.indexOf(".");
  if (currency === "KRW") {
    value = dot === -1 ? value : value.slice(0, dot);
  } else if (dot !== -1) {
    value = `${value.slice(0, dot)}.${value.slice(dot + 1).replace(/\./g, "").slice(0, 2)}`;
  }
  const [integer = "", decimals] = value.split(".");
  const trimmed = integer.replace(/^0+(?=\d)/, "").slice(0, MAX_INTEGER_DIGITS);
  if (decimals === undefined) return trimmed;
  return `${trimmed || "0"}.${decimals}`;
}

/** "12500.5" → "12,500.5"; keeps a trailing "." so typing a decimal isn't eaten. */
export function groupAmount(raw: string): string {
  const [integer = "", decimals] = raw.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimals === undefined ? grouped : `${grouped}.${decimals}`;
}
