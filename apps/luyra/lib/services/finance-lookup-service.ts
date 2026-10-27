import "server-only";
import { Errors } from "@/lib/errors";
import {
  countCategoryUsage,
  countPaymentMethodUsage,
  createCategory as createCategoryRepo,
  createPaymentMethod as createPaymentMethodRepo,
  deleteCategory as deleteCategoryRepo,
  deletePaymentMethod as deletePaymentMethodRepo,
  findCategoriesByUser,
  findCategoryById,
  findCategoryByName,
  findPaymentMethodById,
  findPaymentMethodByName,
  findPaymentMethodsByUser,
  updateCategory as updateCategoryRepo,
  updatePaymentMethod as updatePaymentMethodRepo,
} from "@/lib/repositories/finance-lookup-repository";
import type {
  CreateCategoryInput,
  CreatePaymentMethodInput,
  UpdateCategoryInput,
  UpdatePaymentMethodInput,
} from "@/lib/validation/finance";
import type { Category, LookupUsage, PaymentMethod } from "@/types/finance";

export async function listCategories(userId: string): Promise<Category[]> {
  return findCategoriesByUser(userId);
}

export async function listPaymentMethods(userId: string): Promise<PaymentMethod[]> {
  return findPaymentMethodsByUser(userId);
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

// "12 transactions, 1 budget" — only the tables that actually hold a reference,
// so the message never pads itself with zeroes.
function describeUsage(usage: LookupUsage): string {
  const parts: string[] = [];
  if (usage.transactions > 0) parts.push(plural(usage.transactions, "transaction"));
  if (usage.budgets > 0) parts.push(plural(usage.budgets, "budget"));
  if (usage.templates > 0) parts.push(plural(usage.templates, "template"));
  if (usage.recurring > 0) parts.push(plural(usage.recurring, "recurring rule"));
  return parts.join(", ");
}

export async function addCategory(userId: string, input: CreateCategoryInput): Promise<Category> {
  const existing = await findCategoryByName(userId, input.name);
  if (existing) throw Errors.conflict(`You already have a category named "${existing.name}".`);

  return createCategoryRepo(userId, input);
}

export async function editCategory(userId: string, id: string, input: UpdateCategoryInput): Promise<Category> {
  const current = await findCategoryById(id, userId);
  if (!current) throw Errors.notFound("Category");

  if (input.name !== undefined) {
    const duplicate = await findCategoryByName(userId, input.name, id);
    if (duplicate) throw Errors.conflict(`You already have a category named "${duplicate.name}".`);
  }

  const category = await updateCategoryRepo(id, userId, input);
  if (!category) throw Errors.notFound("Category");
  return category;
}

export async function removeCategory(userId: string, id: string): Promise<void> {
  const category = await findCategoryById(id, userId);
  if (!category) throw Errors.notFound("Category");

  const usage = await countCategoryUsage(id, userId);
  if (usage.total > 0) {
    throw Errors.conflict(
      `"${category.name}" is still used by ${describeUsage(usage)}. Reassign or delete those first.`
    );
  }

  const deleted = await deleteCategoryRepo(id, userId);
  if (!deleted) throw Errors.notFound("Category");
}

export async function addPaymentMethod(userId: string, input: CreatePaymentMethodInput): Promise<PaymentMethod> {
  const existing = await findPaymentMethodByName(userId, input.name);
  if (existing) throw Errors.conflict(`You already have a payment method named "${existing.name}".`);

  return createPaymentMethodRepo(userId, input);
}

export async function editPaymentMethod(
  userId: string,
  id: string,
  input: UpdatePaymentMethodInput
): Promise<PaymentMethod> {
  const current = await findPaymentMethodById(id, userId);
  if (!current) throw Errors.notFound("Payment method");

  if (input.name !== undefined) {
    const duplicate = await findPaymentMethodByName(userId, input.name, id);
    if (duplicate) throw Errors.conflict(`You already have a payment method named "${duplicate.name}".`);
  }

  const paymentMethod = await updatePaymentMethodRepo(id, userId, input);
  if (!paymentMethod) throw Errors.notFound("Payment method");
  return paymentMethod;
}

export async function removePaymentMethod(userId: string, id: string): Promise<void> {
  const paymentMethod = await findPaymentMethodById(id, userId);
  if (!paymentMethod) throw Errors.notFound("Payment method");

  const usage = await countPaymentMethodUsage(id, userId);
  if (usage.total > 0) {
    throw Errors.conflict(
      `"${paymentMethod.name}" is still used by ${describeUsage(usage)}. Reassign or delete those first.`
    );
  }

  const deleted = await deletePaymentMethodRepo(id, userId);
  if (!deleted) throw Errors.notFound("Payment method");
}
