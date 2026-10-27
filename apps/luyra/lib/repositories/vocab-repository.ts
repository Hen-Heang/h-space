import "server-only";
import { sql } from "@/lib/db";
import type { VocabCard } from "@/types/learning";
import type { CreateVocabCardInput, UpdateVocabCardInput } from "@/lib/validation/learning";
import type { SrsResult } from "@/lib/srs";

interface VocabRow {
  id: string;
  category: string;
  term: string;
  meaning: string;
  pronunciation: string | null;
  example: string | null;
  example_translation: string | null;
  tags: string[];
  mastery: number;
  next_review: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  lapses: number;
  created_at: string;
  updated_at: string;
}

function toCard(row: VocabRow): VocabCard {
  return {
    id: row.id,
    category: row.category,
    term: row.term,
    meaning: row.meaning,
    pronunciation: row.pronunciation,
    example: row.example,
    exampleTranslation: row.example_translation,
    tags: row.tags ?? [],
    mastery: row.mastery,
    nextReview: row.next_review,
    easeFactor: row.ease_factor,
    intervalDays: row.interval_days,
    repetitions: row.repetitions,
    lapses: row.lapses,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const VOCAB_COLUMNS = `id, category, term, meaning, pronunciation, example, example_translation, tags, mastery, next_review, ease_factor, interval_days, repetitions, lapses, created_at, updated_at`;

export async function findVocabCardsByUser(userId: string): Promise<VocabCard[]> {
  const rows = (await sql`
    select ${sql.unsafe(VOCAB_COLUMNS)} from learning_vocab_cards
    where user_id = ${userId}
    order by created_at desc
  `) as VocabRow[];

  return rows.map(toCard);
}

// Batch size, not a daily cap — the caller re-fetches once a batch clears.
const DUE_BATCH_SIZE = 20;

export async function findDueVocabCards(userId: string): Promise<VocabCard[]> {
  const rows = (await sql`
    select ${sql.unsafe(VOCAB_COLUMNS)} from learning_vocab_cards
    where user_id = ${userId} and next_review <= now()
    order by next_review asc
    limit ${DUE_BATCH_SIZE}
  `) as VocabRow[];

  return rows.map(toCard);
}

export async function countDueVocabCards(userId: string): Promise<number> {
  const rows = (await sql`
    select count(*)::int as count from learning_vocab_cards
    where user_id = ${userId} and next_review <= now()
  `) as { count: number }[];

  return rows[0].count;
}

export async function findVocabCardById(id: string, userId: string): Promise<VocabCard | null> {
  const rows = (await sql`
    select ${sql.unsafe(VOCAB_COLUMNS)} from learning_vocab_cards
    where id = ${id} and user_id = ${userId}
  `) as VocabRow[];

  return rows[0] ? toCard(rows[0]) : null;
}

export async function createVocabCard(userId: string, input: CreateVocabCardInput): Promise<VocabCard> {
  const rows = (await sql`
    insert into learning_vocab_cards (user_id, category, term, meaning, pronunciation, example, example_translation, tags)
    values (
      ${userId}, ${input.category ?? "General"}, ${input.term}, ${input.meaning},
      ${input.pronunciation ?? null}, ${input.example ?? null}, ${input.exampleTranslation ?? null}, ${input.tags ?? []}
    )
    returning ${sql.unsafe(VOCAB_COLUMNS)}
  `) as VocabRow[];

  return toCard(rows[0]);
}

export async function updateVocabCard(id: string, userId: string, input: UpdateVocabCardInput): Promise<VocabCard | null> {
  const sets: string[] = [];
  const params: unknown[] = [id, userId];
  const set = (column: string, value: unknown) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };

  if (input.category !== undefined) set("category", input.category);
  if (input.term !== undefined) set("term", input.term);
  if (input.meaning !== undefined) set("meaning", input.meaning);
  if (input.pronunciation !== undefined) set("pronunciation", input.pronunciation);
  if (input.example !== undefined) set("example", input.example);
  if (input.exampleTranslation !== undefined) set("example_translation", input.exampleTranslation);
  if (input.tags !== undefined) set("tags", input.tags);
  sets.push("updated_at = now()");

  const rows = (await sql.query(
    `update learning_vocab_cards set ${sets.join(", ")}
     where id = $1 and user_id = $2
     returning ${VOCAB_COLUMNS}`,
    params
  )) as VocabRow[];

  return rows[0] ? toCard(rows[0]) : null;
}

export async function deleteVocabCard(id: string, userId: string): Promise<boolean> {
  const rows = (await sql`
    delete from learning_vocab_cards where id = ${id} and user_id = ${userId} returning id
  `) as { id: string }[];

  return rows.length > 0;
}

export async function applyVocabRating(id: string, userId: string, result: SrsResult): Promise<VocabCard | null> {
  const rows = (await sql`
    update learning_vocab_cards set
      ease_factor = ${result.easeFactor},
      interval_days = ${result.intervalDays},
      repetitions = ${result.repetitions},
      lapses = ${result.lapses},
      mastery = ${result.mastery},
      next_review = ${result.nextReview},
      updated_at = now()
    where id = ${id} and user_id = ${userId}
    returning ${sql.unsafe(VOCAB_COLUMNS)}
  `) as VocabRow[];

  return rows[0] ? toCard(rows[0]) : null;
}
