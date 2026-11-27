// Auth V2 (h-space-api docs/auth-v2.md; vault API Migration notes 10/11):
// pure helpers for H-Space admission, the Spring pilot (session probe +
// Inbox) and the optional GitHub sign-in. Framework-free and tested
// (lib/auth-v2.test.ts). Every switch here is OFF unless explicitly set, and
// a switch only selects a path: it never relaxes a check on the path it
// selects.

/** H-Space admission check after sign-in and on app entry (kori_app_access). */
export const ADMISSION_ENV = "NEXT_PUBLIC_HSPACE_ADMISSION"
/** "spring" sends the Inbox to h-space-api's Auth V2 pilot instead of Supabase. */
export const INBOX_BACKEND_ENV = "NEXT_PUBLIC_AUTHV2_INBOX_BACKEND"
/** h-space-api base URL for the pilot. New name: the retired NEXT_PUBLIC_HSPACE_API_URL may still exist in Vercel. */
export const HUB_API_URL_ENV = "NEXT_PUBLIC_AUTHV2_API_URL"
/** Optional G1: "Continue with GitHub". */
export const GITHUB_SIGN_IN_ENV = "NEXT_PUBLIC_FEATURE_GITHUB_SIGN_IN"

// Read with literal property access so Next.js inlines them at build time.
const env = {
  admission: process.env.NEXT_PUBLIC_HSPACE_ADMISSION,
  inboxBackend: process.env.NEXT_PUBLIC_AUTHV2_INBOX_BACKEND,
  hubApiUrl: process.env.NEXT_PUBLIC_AUTHV2_API_URL,
  github: process.env.NEXT_PUBLIC_FEATURE_GITHUB_SIGN_IN,
}

/** Admission is enforced only when set to exactly "enforce". */
export function isAdmissionEnforced(value: string | undefined = env.admission): boolean {
  return value === "enforce"
}

export function isGitHubSignInEnabled(value: string | undefined = env.github): boolean {
  return value === "true"
}

export type HubApiConfig = { enabled: false } | { enabled: true; baseUrl: string }

/**
 * The Spring pilot is on only with backend "spring" AND a valid http(s) base
 * URL. "spring" without a usable URL throws rather than quietly falling back
 * to Supabase, so a misconfigured build is visible instead of half-migrated.
 */
export function resolveHubApiConfig(
  backend: string | undefined = env.inboxBackend,
  url: string | undefined = env.hubApiUrl,
): HubApiConfig {
  if (backend !== "spring") return { enabled: false }
  const origin = httpOrigin(url)
  if (!origin) {
    throw new Error(
      `${INBOX_BACKEND_ENV}=spring needs ${HUB_API_URL_ENV} set to the h-space-api base URL (http(s) origin).`,
    )
  }
  return { enabled: true, baseUrl: origin }
}

/** The origin of an http(s) URL, or null. Paths, queries and credentials are not allowed. */
export function httpOrigin(url: string | undefined | null): string | null {
  if (!url?.trim()) return null
  try {
    const parsed = new URL(url.trim())
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null
    if (parsed.username || parsed.password) return null
    if (parsed.pathname !== "/" || parsed.search || parsed.hash) return null
    return parsed.origin
  } catch {
    return null
  }
}

// ─── Admission ──────────────────────────────────────────────────────────────

export type Admission = "approved" | "denied" | "unavailable"

/**
 * Interprets the self-read of kori_app_access (RLS returns at most the
 * caller's own row). Fails closed: an error or an unexpected shape is
 * "unavailable", never "approved"; no row or any status other than exactly
 * "approved" is "denied".
 */
export function interpretAdmission(data: unknown, error: unknown): Admission {
  if (error) return "unavailable"
  if (!Array.isArray(data) || data.length > 1) return "unavailable"
  if (data.length === 0) return "denied"
  const status = (data[0] as { status?: unknown } | null)?.status
  if (typeof status !== "string") return "unavailable"
  return status === "approved" ? "approved" : "denied"
}

export const ACCESS_DENIED_MESSAGE =
  "This account doesn't have access to H-Space. H-Space is private: ask its owner if you think you should."
export const ADMISSION_UNAVAILABLE_MESSAGE =
  "H-Space couldn't confirm your access right now, so you've been signed out. Try again in a moment."

/** Thrown by sign-in when admission says no (or can't say). The session is already ended. */
export class AdmissionError extends Error {
  readonly admission: Exclude<Admission, "approved">
  constructor(admission: Exclude<Admission, "approved">) {
    super(admission === "denied" ? ACCESS_DENIED_MESSAGE : ADMISSION_UNAVAILABLE_MESSAGE)
    this.name = "AdmissionError"
    this.admission = admission
  }
}

// ─── User-scoped caches ─────────────────────────────────────────────────────

/**
 * Whether user-specific client caches must be dropped: the signed-in account
 * changed, including to signed-out. A refresh of the same user's token keeps
 * them. `undefined` = not observed yet (first render).
 */
export function shouldClearUserCache(
  previous: string | null | undefined,
  next: string | null,
): boolean {
  if (previous === undefined) return false
  return previous !== next
}

// ─── h-space-api envelope ───────────────────────────────────────────────────

export type HubErrorKind =
  | "unauthorized"
  | "mfa_required"
  | "forbidden"
  | "not_found"
  | "bad_request"
  | "unavailable"
  | "network"
  | "other"

/** An h-space-api failure, normalised. `message` is safe to show; nothing else leaks. */
export class HubApiError extends Error {
  readonly kind: HubErrorKind
  readonly httpStatus: number
  readonly requestId: string | null
  constructor(kind: HubErrorKind, httpStatus: number, message: string, requestId: string | null) {
    super(message)
    this.name = "HubApiError"
    this.kind = kind
    this.httpStatus = httpStatus
    this.requestId = requestId
  }
}

// Must match hub-api's PilotErrorWriter.MFA_REQUIRED_MESSAGE.
export const HUB_MFA_REQUIRED_MESSAGE =
  "This needs a session verified with your authenticator code."

const GENERIC_MESSAGES: Record<HubErrorKind, string> = {
  unauthorized: "Your session ended. Sign in again.",
  mfa_required: "Verify with your authenticator code to use this.",
  forbidden: "This account doesn't have access to this.",
  not_found: "That item doesn't exist or isn't yours.",
  bad_request: "That request wasn't valid.",
  unavailable: "H-Space is unavailable right now. Try again in a moment.",
  network: "Couldn't reach H-Space. Check your connection and try again.",
  other: "Something went wrong. Try again.",
}

type Envelope = {
  status?: { code?: unknown; message?: unknown; requestId?: unknown }
  data?: unknown
}

/**
 * Unwraps h-space-api's `{ status: { code, message, requestId? }, data }`.
 * A 2xx with status.code 200 returns `data`; anything else throws HubApiError.
 * Validation details (400) keep the server's message; other errors use fixed
 * copy so library or server text is never shown.
 */
export function unwrapHubEnvelope<T>(httpStatus: number, body: unknown): T {
  const envelope = (body && typeof body === "object" ? body : {}) as Envelope
  const requestId =
    typeof envelope.status?.requestId === "string" ? envelope.status.requestId : null
  if (httpStatus >= 200 && httpStatus < 300 && envelope.status?.code === 200) {
    return envelope.data as T
  }
  const serverMessage = typeof envelope.status?.message === "string" ? envelope.status.message : ""
  const kind = errorKind(httpStatus, serverMessage)
  const message = kind === "bad_request" && serverMessage ? serverMessage : GENERIC_MESSAGES[kind]
  throw new HubApiError(kind, httpStatus, message, requestId)
}

function errorKind(httpStatus: number, serverMessage: string): HubErrorKind {
  if (httpStatus === 401) return "unauthorized"
  if (httpStatus === 403)
    return serverMessage === HUB_MFA_REQUIRED_MESSAGE ? "mfa_required" : "forbidden"
  if (httpStatus === 404) return "not_found"
  if (httpStatus === 400) return "bad_request"
  if (httpStatus === 503) return "unavailable"
  return "other"
}

export function networkError(): HubApiError {
  return new HubApiError("network", 0, GENERIC_MESSAGES.network, null)
}

// ─── Session probe ──────────────────────────────────────────────────────────

export type HubSession = {
  userId: string
  aal: "aal1" | "aal2"
  expiresAt: string | null
  mfaRequiredForInbox: boolean
}

export type PilotState =
  | { kind: "ready"; session: HubSession }
  | { kind: "mfa_enrollment_required"; session: HubSession }
  | { kind: "access_denied" }
  | { kind: "unavailable" }
  | { kind: "expired" }

/** What the Inbox should show for a probe result. Only an exact aal2 is ready when MFA is required. */
export function pilotStateFor(result: HubSession | HubApiError): PilotState {
  if (result instanceof HubApiError) {
    if (result.kind === "unauthorized") return { kind: "expired" }
    if (result.kind === "forbidden" || result.kind === "mfa_required")
      return { kind: "access_denied" }
    return { kind: "unavailable" }
  }
  if (result.mfaRequiredForInbox && result.aal !== "aal2") {
    return { kind: "mfa_enrollment_required", session: result }
  }
  return { kind: "ready", session: result }
}

/** Parses the probe's data defensively; anything unexpected is treated as an unavailable answer. */
export function parseHubSession(data: unknown): HubSession {
  const d = (data && typeof data === "object" ? data : {}) as Record<string, unknown>
  if (typeof d.userId !== "string" || typeof d.mfaRequiredForInbox !== "boolean") {
    throw new HubApiError("unavailable", 200, GENERIC_MESSAGES.unavailable, null)
  }
  return {
    userId: d.userId,
    aal: d.aal === "aal2" ? "aal2" : "aal1",
    expiresAt: typeof d.expiresAt === "string" ? d.expiresAt : null,
    mfaRequiredForInbox: d.mfaRequiredForInbox,
  }
}
