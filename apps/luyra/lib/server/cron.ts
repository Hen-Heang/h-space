import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

// Every /api/cron/* route is a public URL that sends messages and writes
// alert state, so it has to prove it is the scheduler and not a passer-by.
// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; anything else is
// rejected before a single row is read.
//
// Returns a response to send back when the request is NOT authorized, and
// null when it is — so a route reads:
//
//   const unauthorized = requireCronAuthorization(request);
//   if (unauthorized) return unauthorized;

/** What every cron route returns, so a run is legible in the Vercel logs. */
export interface CronRunResult {
  /** Users considered. */
  scanned: number;
  /** Successful deliveries. A user reached on two channels counts twice. */
  notified: number;
  /** Per-channel breakdown, for jobs that deliver on more than one channel. */
  channels?: { telegram?: number; email?: number; push?: number };
  /** Set when the run stopped before doing any work. */
  skipped?: string;
}

function safeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // timingSafeEqual throws on length mismatch, so compare lengths first —
  // the length of a secret is not the part worth hiding.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function requireCronAuthorization(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  // Unset secret means "no scheduler configured". Fail closed: without this
  // an empty env var would make every cron route world-callable.
  if (!secret) {
    return NextResponse.json(
      { error: { code: "CRON_NOT_CONFIGURED", message: "CRON_SECRET is not set" } },
      { status: 503 }
    );
  }

  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ") || !safeEquals(header.slice("Bearer ".length), secret)) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Invalid cron credentials" } }, { status: 401 });
  }

  return null;
}
