import "server-only";
import { Errors } from "@/lib/errors";
import {
  countTemplatesByUser,
  createTemplate as createTemplateRepo,
  deleteTemplate as deleteTemplateRepo,
  findTemplatesByUser,
} from "@/lib/repositories/finance-transaction-template-repository";
import type { CreateTransactionTemplateInput } from "@/lib/validation/finance";
import type { TransactionTemplate } from "@/types/finance";

// Templates are for speed, not automation — capped so the quick-add strip
// stays scannable rather than growing without bound.
const MAX_TEMPLATES_PER_USER = 12;

export async function listTemplates(userId: string): Promise<TransactionTemplate[]> {
  return findTemplatesByUser(userId);
}

export async function addTemplate(userId: string, input: CreateTransactionTemplateInput): Promise<TransactionTemplate> {
  const count = await countTemplatesByUser(userId);
  if (count >= MAX_TEMPLATES_PER_USER) {
    throw Errors.validation(`You can save up to ${MAX_TEMPLATES_PER_USER} templates. Delete one before adding another.`);
  }
  return createTemplateRepo(userId, input);
}

export async function removeTemplate(userId: string, id: string): Promise<void> {
  const deleted = await deleteTemplateRepo(id, userId);
  if (!deleted) throw Errors.notFound("Template");
}
