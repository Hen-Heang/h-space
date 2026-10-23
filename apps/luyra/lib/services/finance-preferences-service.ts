import "server-only";
import { Errors } from "@/lib/errors";
import { findPreferences, upsertPreferences } from "@/lib/repositories/finance-preferences-repository";
import type { UpdatePreferencesInput } from "@/lib/validation/finance";
import type { FinancePreferences } from "@/types/finance";

export async function getPreferences(userId: string): Promise<FinancePreferences> {
  return findPreferences(userId);
}

export async function editPreferences(userId: string, input: UpdatePreferencesInput): Promise<FinancePreferences> {
  // updatePreferencesSchema only rejects essentialTargetPct + targetSavingsRate
  // over 100 when both are given in the same request. A request that changes
  // just one of the two still needs checking against whichever value is
  // already stored, or Essentials + Future could be pushed past 100% (leaving
  // Lifestyle negative) one field at a time.
  if (input.essentialTargetPct !== undefined || input.targetSavingsRate !== undefined) {
    const current = await findPreferences(userId);
    const essentialTargetPct = input.essentialTargetPct ?? current.essentialTargetPct;
    const targetSavingsRate = input.targetSavingsRate ?? current.targetSavingsRate;
    if (essentialTargetPct + targetSavingsRate > 100) {
      throw Errors.validation("Essentials and Future targets can't add up to more than 100%");
    }
  }

  return upsertPreferences(userId, input);
}
