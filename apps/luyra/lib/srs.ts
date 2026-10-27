// SM-2-based spaced-repetition scheduler for vocabulary review. Ported
// verbatim from Hengo's lib/srs.ts — pure, no React/DB, so it's identical on
// the client (interval preview on grade buttons) and the server (persisting
// the graded result).

export type ReviewRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export const RATINGS: ReviewRating[] = ["AGAIN", "HARD", "GOOD", "EASY"];

const MIN_EASE = 1.3;
const START_EASE = 2.5;
const MAX_INTERVAL_DAYS = 365;
const EASY_BONUS = 1.3;

type SrsState = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
};

/** Days until the card would come back if graded with `rating` right now. */
export function previewIntervalDays(card: SrsState, rating: ReviewRating): number {
  const ease = card.easeFactor < MIN_EASE ? START_EASE : card.easeFactor;
  const reps = Math.max(0, card.repetitions);
  const interval = Math.max(0, card.intervalDays);

  let next: number;
  switch (rating) {
    case "AGAIN":
      next = 0;
      break;
    case "HARD":
      next = reps === 0 ? 1 : Math.max(interval + 1, Math.round(interval * 1.2));
      break;
    case "GOOD":
      if (reps === 0) next = 1;
      else if (reps === 1) next = 3;
      else next = Math.max(interval + 1, Math.round(interval * ease));
      break;
    case "EASY":
      if (reps === 0) next = 4;
      else if (reps === 1) next = 7;
      else next = Math.max(interval + 1, Math.round(interval * (ease + 0.15) * EASY_BONUS));
      break;
  }
  return Math.min(next, MAX_INTERVAL_DAYS);
}

export interface SrsCardState extends SrsState {
  lapses: number;
  mastery: number; // 0-100
}

export interface SrsResult extends SrsCardState {
  intervalDays: number;
  nextReview: string; // ISO timestamp
}

const MASTERY_DELTA: Record<ReviewRating, number> = {
  AGAIN: -15,
  HARD: 5,
  GOOD: 10,
  EASY: 15,
};

/**
 * Full post-grade state. SM-2 ease adjustments: AGAIN -0.2 + lapse + reps
 * reset, HARD -0.15, GOOD unchanged, EASY +0.15.
 */
export function applyRating(card: SrsCardState, rating: ReviewRating): SrsResult {
  const interval = previewIntervalDays(card, rating);
  const baseEase = card.easeFactor < MIN_EASE ? START_EASE : card.easeFactor;

  let easeFactor = baseEase;
  if (rating === "AGAIN") easeFactor = baseEase - 0.2;
  else if (rating === "HARD") easeFactor = baseEase - 0.15;
  else if (rating === "EASY") easeFactor = baseEase + 0.15;
  easeFactor = Math.max(MIN_EASE, Math.round(easeFactor * 100) / 100);

  const repetitions = rating === "AGAIN" ? 0 : Math.max(0, card.repetitions) + 1;
  const lapses = Math.max(0, card.lapses) + (rating === "AGAIN" ? 1 : 0);
  const mastery = Math.max(0, Math.min(100, card.mastery + MASTERY_DELTA[rating]));

  const next = new Date();
  next.setDate(next.getDate() + interval);

  return { easeFactor, intervalDays: interval, repetitions, lapses, mastery, nextReview: next.toISOString() };
}

/** Whether a card is due for review — compares full ISO timestamps. */
export function isDue(nextReview: string, now: Date = new Date()): boolean {
  return nextReview <= now.toISOString();
}

/** "Today", "3d", "2.5mo", "1y" — compact Anki-style interval labels. */
export function formatInterval(days: number): string {
  if (days <= 0) return "Today";
  if (days < 30) return `${days}d`;
  if (days < 365) {
    const months = Math.round((days / 30) * 10) / 10;
    return `${months % 1 === 0 ? months.toFixed(0) : months}mo`;
  }
  const years = Math.round((days / 365) * 10) / 10;
  return `${years % 1 === 0 ? years.toFixed(0) : years}y`;
}
