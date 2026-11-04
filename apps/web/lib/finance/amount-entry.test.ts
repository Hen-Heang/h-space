import { describe, expect, it } from "vitest";
import { groupAmount, sanitizeAmount } from "@/lib/finance/amount-entry";

describe("sanitizeAmount", () => {
  it("strips separators, symbols and leading zeros", () => {
    expect(sanitizeAmount("₩12,500", "KRW")).toBe("12500");
    expect(sanitizeAmount("007", "KRW")).toBe("7");
    expect(sanitizeAmount("0", "KRW")).toBe("0");
    expect(sanitizeAmount("", "KRW")).toBe("");
  });

  it("drops decimals for KRW", () => {
    expect(sanitizeAmount("12.50", "KRW")).toBe("12");
  });

  it("keeps at most two decimals and one point for USD", () => {
    expect(sanitizeAmount("12.", "USD")).toBe("12.");
    expect(sanitizeAmount("12.345", "USD")).toBe("12.34");
    expect(sanitizeAmount("1.2.3", "USD")).toBe("1.23");
    expect(sanitizeAmount(".5", "USD")).toBe("0.5");
  });

  it("caps very long input", () => {
    expect(sanitizeAmount("12345678901234567", "KRW")).toHaveLength(12);
  });
});

describe("groupAmount", () => {
  it("inserts thousands separators in the integer part only", () => {
    expect(groupAmount("1234567")).toBe("1,234,567");
    expect(groupAmount("1234.56")).toBe("1,234.56");
    expect(groupAmount("999")).toBe("999");
    expect(groupAmount("")).toBe("");
  });

  it("keeps a trailing decimal point while typing", () => {
    expect(groupAmount("1000.")).toBe("1,000.");
  });
});
