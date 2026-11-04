export const krw = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

export const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

/**
 * Splits a formatted amount into its sign, currency symbol and numerals, so a
 * caller can keep the symbol out of a monospace run. Returns null for anything
 * that doesn't start with a symbol (percentages, plain counts), which the
 * caller should then render untouched.
 */
export function splitCurrency(formatted: string): { sign: string; symbol: string; digits: string } | null {
  const match = /^([+\-\u2212]?)([^\d\s]+)(.*)$/u.exec(formatted);
  if (!match || !match[2] || !match[3]) return null;
  return { sign: match[1]!, symbol: match[2]!, digits: match[3]! };
}
