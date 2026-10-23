import "server-only";

// In-memory, best-effort only — a serverless deployment may run multiple
// instances with no shared memory, so this is defense-in-depth, not a hard
// guarantee. Good enough to blunt casual abuse of an unauthenticated
// webhook or a code-generation endpoint without adding an external
// dependency (Redis, etc.) for a single-user app.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): { allowed: boolean } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= max) return { allowed: false };
  bucket.count += 1;
  return { allowed: true };
}
