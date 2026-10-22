import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const txRepo = vi.hoisted(() => ({
  createTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  deleteTransactionsByIds: vi.fn(),
  findDescriptionSuggestions: vi.fn(),
  findTransactionsByUser: vi.fn(),
  findTransactionTypesByIds: vi.fn(),
  setCategoryForTransactions: vi.fn(),
  updateTransaction: vi.fn(),
}));
const lookupRepo = vi.hoisted(() => ({ findCategoryById: vi.fn() }));
vi.mock("@/lib/repositories/finance-transaction-repository", () => txRepo);
vi.mock("@/lib/repositories/finance-lookup-repository", () => lookupRepo);

import { applyBulkTransactionAction } from "@/lib/services/finance-transaction-service";

const USER = "11111111-1111-4111-8111-111111111111";
const IDS = ["22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333"];
const CATEGORY = "44444444-4444-4444-8444-444444444444";

function category(type: "income" | "expense" | "both") {
  return { id: CATEGORY, name: "Food", type };
}

describe("applyBulkTransactionAction", () => {
  beforeEach(() => {
    txRepo.deleteTransactionsByIds.mockResolvedValue(2);
    txRepo.setCategoryForTransactions.mockResolvedValue(2);
  });

  afterEach(() => vi.resetAllMocks());

  it("deletes the selected rows for this user and reports how many went", async () => {
    await expect(applyBulkTransactionAction(USER, { action: "delete", ids: IDS })).resolves.toEqual({ affected: 2 });
    expect(txRepo.deleteTransactionsByIds).toHaveBeenCalledWith(USER, IDS);
  });

  it("moves rows to a category whose type matches every selected row", async () => {
    lookupRepo.findCategoryById.mockResolvedValue(category("expense"));
    txRepo.findTransactionTypesByIds.mockResolvedValue(["expense"]);

    await expect(
      applyBulkTransactionAction(USER, { action: "recategorize", ids: IDS, categoryId: CATEGORY })
    ).resolves.toEqual({ affected: 2 });
    expect(txRepo.setCategoryForTransactions).toHaveBeenCalledWith(USER, IDS, CATEGORY);
  });

  it("refuses an expense-only category when the selection includes income", async () => {
    lookupRepo.findCategoryById.mockResolvedValue(category("expense"));
    txRepo.findTransactionTypesByIds.mockResolvedValue(["expense", "income"]);

    await expect(
      applyBulkTransactionAction(USER, { action: "recategorize", ids: IDS, categoryId: CATEGORY })
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(txRepo.setCategoryForTransactions).not.toHaveBeenCalled();
  });

  it("accepts a 'both' category for a mixed selection without checking types", async () => {
    lookupRepo.findCategoryById.mockResolvedValue(category("both"));

    await applyBulkTransactionAction(USER, { action: "recategorize", ids: IDS, categoryId: CATEGORY });
    expect(txRepo.findTransactionTypesByIds).not.toHaveBeenCalled();
    expect(txRepo.setCategoryForTransactions).toHaveBeenCalledWith(USER, IDS, CATEGORY);
  });

  it("rejects a category that isn't the user's", async () => {
    lookupRepo.findCategoryById.mockResolvedValue(null);

    await expect(
      applyBulkTransactionAction(USER, { action: "recategorize", ids: IDS, categoryId: CATEGORY })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(lookupRepo.findCategoryById).toHaveBeenCalledWith(CATEGORY, USER);
  });

  it("clears the category without any lookup", async () => {
    await applyBulkTransactionAction(USER, { action: "recategorize", ids: IDS, categoryId: null });
    expect(lookupRepo.findCategoryById).not.toHaveBeenCalled();
    expect(txRepo.setCategoryForTransactions).toHaveBeenCalledWith(USER, IDS, null);
  });
});
