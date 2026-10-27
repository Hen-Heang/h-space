import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const repo = vi.hoisted(() => ({
  deleteMerchantMerge: vi.fn(),
  findExpensesSince: vi.fn(),
  findMerchantAliases: vi.fn(),
  saveMerchantMerge: vi.fn(),
}));
vi.mock("@/lib/repositories/finance-merchant-alias-repository", () => repo);

import { getMerchantNames, mergeMerchants, unmergeMerchants } from "@/lib/services/finance-merchant-alias-service";

const USER = "user-1";
const spent = (description: string) => ({ description, categoryId: null, date: "2026-10-01", amountKrw: 30_000 });

describe("mergeMerchants", () => {
  afterEach(() => vi.resetAllMocks());

  it("records each key with its most-used spelling, under the chosen name", async () => {
    repo.findExpensesSince.mockResolvedValue([spent("Claude"), spent("Claude"), spent("CLAUDE"), spent("Claude AI Pro")]);

    await expect(mergeMerchants(USER, "Claude", ["claude", "claude ai pro"])).resolves.toEqual({ merged: 2 });
    expect(repo.saveMerchantMerge).toHaveBeenCalledWith(USER, "Claude", [
      { normalizedKey: "claude", sample: "Claude" },
      { normalizedKey: "claude ai pro", sample: "Claude AI Pro" },
    ]);
  });

  it("adds the name's own key, so a new name still resolves", async () => {
    repo.findExpensesSince.mockResolvedValue([spent("Claude"), spent("Claude AI Pro")]);

    await mergeMerchants(USER, "Anthropic", ["claude", "claude ai pro"]);
    const members = repo.saveMerchantMerge.mock.calls[0][2] as { normalizedKey: string; sample: string }[];
    expect(members.map((m) => m.normalizedKey).sort()).toEqual(["anthropic", "claude", "claude ai pro"]);
    expect(members.find((m) => m.normalizedKey === "anthropic")?.sample).toBe("Anthropic");
  });

  it("normalizes submitted keys, so cosmetic variants don't count as separate names", async () => {
    repo.findExpensesSince.mockResolvedValue([]);
    // "NETFLIX" and "netflix.com" are one key, and the name is that same key — nothing to merge.
    await expect(mergeMerchants(USER, "Netflix", ["NETFLIX", "netflix.com"])).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(repo.saveMerchantMerge).not.toHaveBeenCalled();
  });

  it("rejects a name with no letters or numbers", async () => {
    await expect(mergeMerchants(USER, "...", ["claude", "claude ai pro"])).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("getMerchantNames", () => {
  afterEach(() => vi.resetAllMocks());

  it("groups stored alias rows into merges and leaves merged names out of suggestions", async () => {
    repo.findMerchantAliases.mockResolvedValue([
      { normalizedKey: "claude", canonicalDescription: "Claude", variantDescription: "Claude" },
      { normalizedKey: "claude ai pro", canonicalDescription: "Claude", variantDescription: "Claude AI Pro" },
    ]);
    repo.findExpensesSince.mockResolvedValue([spent("Claude"), spent("Claude AI Pro"), spent("Claude AI Pro")]);

    const result = await getMerchantNames(USER);
    expect(result.merges).toEqual([
      { name: "Claude", variants: [{ key: "claude", sample: "Claude" }, { key: "claude ai pro", sample: "Claude AI Pro" }] },
    ]);
    expect(result.suggestions).toEqual([]);
  });
});

describe("unmergeMerchants", () => {
  afterEach(() => vi.resetAllMocks());

  it("404s when there was no such merge", async () => {
    repo.deleteMerchantMerge.mockResolvedValue(0);
    await expect(unmergeMerchants(USER, "Nope")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
