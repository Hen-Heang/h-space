import "server-only";
import { Errors } from "@/lib/errors";
import {
  applyVocabRating,
  countDueVocabCards,
  createVocabCard as createVocabCardRepo,
  deleteVocabCard as deleteVocabCardRepo,
  findDueVocabCards,
  findVocabCardById,
  findVocabCardsByUser,
  updateVocabCard as updateVocabCardRepo,
} from "@/lib/repositories/vocab-repository";
import { applyRating, type ReviewRating } from "@/lib/srs";
import type { CreateVocabCardInput, UpdateVocabCardInput } from "@/lib/validation/learning";
import type { VocabCard } from "@/types/learning";

export async function listVocabCards(userId: string): Promise<VocabCard[]> {
  return findVocabCardsByUser(userId);
}

export async function listDueVocabCards(userId: string): Promise<{ due: VocabCard[]; dueCount: number }> {
  const [due, dueCount] = await Promise.all([findDueVocabCards(userId), countDueVocabCards(userId)]);
  return { due, dueCount };
}

export async function addVocabCard(userId: string, input: CreateVocabCardInput): Promise<VocabCard> {
  return createVocabCardRepo(userId, input);
}

export async function editVocabCard(userId: string, id: string, input: UpdateVocabCardInput): Promise<VocabCard> {
  const card = await updateVocabCardRepo(id, userId, input);
  if (!card) throw Errors.notFound("Vocab card");
  return card;
}

export async function removeVocabCard(userId: string, id: string): Promise<void> {
  const deleted = await deleteVocabCardRepo(id, userId);
  if (!deleted) throw Errors.notFound("Vocab card");
}

export async function rateVocabCard(userId: string, id: string, rating: ReviewRating): Promise<VocabCard> {
  const card = await findVocabCardById(id, userId);
  if (!card) throw Errors.notFound("Vocab card");

  const result = applyRating(
    {
      easeFactor: card.easeFactor,
      intervalDays: card.intervalDays,
      repetitions: card.repetitions,
      lapses: card.lapses,
      mastery: card.mastery,
    },
    rating
  );
  const updated = await applyVocabRating(id, userId, result);
  if (!updated) throw Errors.notFound("Vocab card");
  return updated;
}
