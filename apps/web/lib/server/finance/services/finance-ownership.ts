import "server-only";
import { Errors } from "@/lib/server/finance/errors";
import { findCategoryById, findPaymentMethodById } from "@/lib/server/finance/repositories/finance-lookup-repository";

// Added in H-Space (not in Luyra): every write that stores a category or
// payment-method id must prove the id belongs to the same user. Without this
// a request could attach someone else's category to its own row, and the
// list queries (which join categories by id) would then show that category's
// name. Bulk recategorize already checked categories; this covers the rest.
export async function assertOwnedReferences(
  userId: string,
  refs: { categoryId?: string | null; paymentMethodId?: string | null }
): Promise<void> {
  const [category, paymentMethod] = await Promise.all([
    refs.categoryId ? findCategoryById(refs.categoryId, userId) : Promise.resolve(undefined),
    refs.paymentMethodId ? findPaymentMethodById(refs.paymentMethodId, userId) : Promise.resolve(undefined),
  ]);
  if (category === null) throw Errors.validation("Choose one of your categories");
  if (paymentMethod === null) throw Errors.validation("Choose one of your payment methods");
}
