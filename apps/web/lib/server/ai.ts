// Shared server-side plumbing for the app/api/ai/* routes — the AI features the
// Spring backend used to own. Server-only: uses OPENAI_API_KEY.
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"
import {
  IS_SUPABASE_CONFIGURED,
  SUPABASE_CONFIGURATION_MESSAGE,
  SUPABASE_KEY,
  SUPABASE_URL,
} from "@/lib/supabase"
import { DEFAULT_ALLOWED_MODEL, resolveAllowedModel } from "@/lib/server/models"
import { KOREAN_LEARNING_GOAL_PROMPT, type KoreanLearningGoal } from "@/lib/korean-coach/schemas"
import { checkRateLimit, recordUsage, RATE_LIMIT_BUCKETS } from "@/lib/server/ai-limits"

// Thrown by a buildPrompt function to signal "this is bad input" (400)
// rather than "the AI call itself failed" (500).
export class InputValidationError extends Error {}

export const DEFAULT_MODEL = DEFAULT_ALLOWED_MODEL

// Call with no argument for the configured default (that is every caller
// today). The optional name still resolves through the allowlist so an
// arbitrary string can never reach the OpenAI model factory.
export function aiModel(name?: string | null) {
  return openai(resolveAllowedModel(name))
}

// gpt-5-mini is a reasoning model that defaults to "medium" reasoning effort
// and "medium" verbosity when neither is specified — noticeable latency for
// tasks as small as grading one sentence or looking up a word. Every route's
// generateObject/streamText call should pass this so the model only "thinks"
// as much as a short-form tutoring task actually needs.
export const AI_PROVIDER_OPTIONS = {
  openai: {
    reasoningEffort: "low",
    textVerbosity: "low",
  },
} as const

export interface AuthedRequest {
  user: User
  // Per-request client carrying the caller's JWT → RLS applies, no service key.
  db: SupabaseClient
}

export async function requireUser(req: Request): Promise<AuthedRequest | Response> {
  if (!IS_SUPABASE_CONFIGURED) {
    return Response.json({ error: SUPABASE_CONFIGURATION_MESSAGE }, { status: 503 })
  }
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return Response.json({ error: "Not signed in" }, { status: 401 })
  const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) return Response.json({ error: "Invalid session" }, { status: 401 })
  return { user: data.user, db }
}

export const TUTOR_SYSTEM =
  "You are Hengo, a Korean-language tutor for software developers working in Korea. " +
  "Focus on practical workplace and technical Korean. Be concise and encouraging."

// Shared across every Korean-formality-producing prompt so the model always
// picks from the same three labels instead of inventing its own wording.
export const FORMALITY_LABELS = "반말 (casual), 존댓말 (polite), or 격식체 (formal)"

export interface LearnerProfile {
  occupation?: string | null
  /** The single goal setting, from kori_korean_coach_preferences.main_goal
   *  (/korean-coach/preferences). kori_profiles.learning_goal used to feed
   *  this and no longer does — see the 2026-09-09 backfill migration. */
  mainGoal?: KoreanLearningGoal | null
  nativeLanguage?: string | null
  country?: string | null
}

// Personalization snippet spliced into tutoring prompts — tailors examples/
// difficulty to the learner's job and goal without the model calling it out
// explicitly. Returns "" when nothing is set, so callers can drop it cleanly.
export function learnerProfileBlock(profile: LearnerProfile | null | undefined): string {
  if (!profile) return ""
  const lines: string[] = []
  if (profile.occupation) lines.push(`- Job: ${profile.occupation}`)
  if (profile.mainGoal) {
    lines.push(`- Main learning goal: ${KOREAN_LEARNING_GOAL_PROMPT[profile.mainGoal]}`)
  }
  if (profile.nativeLanguage) {
    lines.push(
      `- Native language: ${profile.nativeLanguage} — for hard words you may add a short gloss in ${profile.nativeLanguage} in addition to English.`,
    )
  }
  if (profile.country) lines.push(`- From: ${profile.country}`)
  if (lines.length === 0) return ""
  return (
    "About the learner (use this to tailor examples, topics, and difficulty to their job and goal — " +
    "don't mention it explicitly unless relevant):\n" +
    lines.join("\n")
  )
}

/** Wraps learner-supplied text in a `<user_data>` block for a prompt. Any
 *  user_data tag inside the text is removed first, so pasted text can't close
 *  the block early and pose as instructions. Pair it with a prompt line that
 *  says the block is data, never instructions. */
export function userDataBlock(text: string): string {
  const inert = text.replace(/<\s*\/?\s*user_data[^>]*>/gi, "")
  return `<user_data>\n${inert}\n</user_data>`
}

export interface JsonAiRouteConfig<
  In extends z.ZodType = z.ZodType,
  Out extends z.ZodType = z.ZodType,
> {
  // When provided, the raw request body is validated against this before
  // buildPrompt runs — invalid input returns 400, never reaches the model.
  inputSchema?: In
  outputSchema: Out
  buildPrompt: (input: z.infer<In>, ctx: AuthedRequest) => string | Promise<string>
  system?: string
  // Identifies this route in kori_ai_usage and for rate-limit bucketing
  // (see lib/server/ai-limits.ts) — required so every migrated route is
  // both validated and tracked.
  feature: string
}

function isZodSchema(value: unknown): value is z.ZodType {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as z.ZodType).safeParse === "function"
  )
}

/** Factory for the JSON AI endpoints: auth → rate limit → validate → prompt
 *  → generateObject → JSON, with usage logging throughout.
 *
 *  Two call shapes:
 *  - Legacy (being migrated off): `jsonAiRoute(outputSchema, buildPrompt, system?)`
 *    — no input validation, generic rate-limit bucket/usage feature name.
 *  - Preferred: `jsonAiRoute({ inputSchema?, outputSchema, buildPrompt, system?, feature })`. */
export function jsonAiRoute<S extends z.ZodType>(
  schema: S,
  buildPrompt: (body: Record<string, unknown>, ctx: AuthedRequest) => string | Promise<string>,
  system?: string,
): (req: Request) => Promise<Response>
export function jsonAiRoute<In extends z.ZodType, Out extends z.ZodType>(
  config: JsonAiRouteConfig<In, Out>,
): (req: Request) => Promise<Response>
export function jsonAiRoute(
  schemaOrConfig: z.ZodType | JsonAiRouteConfig,
  legacyBuildPrompt?: (
    body: Record<string, unknown>,
    ctx: AuthedRequest,
  ) => string | Promise<string>,
  legacySystem?: string,
) {
  const config: JsonAiRouteConfig = isZodSchema(schemaOrConfig)
    ? {
        outputSchema: schemaOrConfig,
        buildPrompt: legacyBuildPrompt as JsonAiRouteConfig["buildPrompt"],
        system: legacySystem,
        feature: "ai_structured_legacy",
      }
    : schemaOrConfig

  return async function POST(req: Request): Promise<Response> {
    const auth = await requireUser(req)
    if (auth instanceof Response) return auth
    const { user, db } = auth
    const startedAt = performance.now()

    const rateStatus = await checkRateLimit(db, user.id, config.feature)
    if (!rateStatus.allowed) {
      return Response.json(
        {
          error: `Daily limit reached for ${RATE_LIMIT_BUCKETS[rateStatus.bucket].description.toLowerCase()} (${rateStatus.limit}/day). Try again tomorrow.`,
        },
        { status: 429 },
      )
    }

    const rawBody = (await req.json().catch(() => ({}))) as Record<string, unknown>
    let input: unknown = rawBody
    if (config.inputSchema) {
      const parsed = config.inputSchema.safeParse(rawBody)
      if (!parsed.success) {
        return Response.json(
          { error: "Invalid request", details: parsed.error.issues.map((i) => i.message) },
          { status: 400 },
        )
      }
      input = parsed.data
    }

    try {
      const prompt = await config.buildPrompt(input, auth)
      const { object, usage } = await generateObject({
        model: aiModel(),
        providerOptions: AI_PROVIDER_OPTIONS,
        schema: config.outputSchema,
        system: config.system ?? TUTOR_SYSTEM,
        prompt,
      })
      void recordUsage(db, {
        userId: user.id,
        feature: config.feature,
        model: DEFAULT_MODEL,
        inputTokens: usage?.inputTokens ?? null,
        outputTokens: usage?.outputTokens ?? null,
        totalTokens: usage?.totalTokens ?? null,
        latencyMs: Math.round(performance.now() - startedAt),
        success: true,
      })
      return Response.json(object)
    } catch (err) {
      const isValidationError = err instanceof InputValidationError
      // Only our own validation messages reach the client — a provider or
      // network error's text can carry internal details, so it's replaced.
      const message =
        isValidationError && err instanceof Error
          ? err.message
          : "The AI service couldn't complete this request. Please try again."
      void recordUsage(db, {
        userId: user.id,
        feature: config.feature,
        model: DEFAULT_MODEL,
        latencyMs: Math.round(performance.now() - startedAt),
        success: false,
        errorCode: isValidationError
          ? "invalid_input"
          : err instanceof Error
            ? err.name
            : "unknown",
      })
      return Response.json({ error: message }, { status: isValidationError ? 400 : 500 })
    }
  }
}

// ── SSE helpers (same event protocol the Spring stream endpoints used) ──────

export function sseChunk(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export function sseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
