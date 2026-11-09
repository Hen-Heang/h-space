// Where to send someone after sign-in: the page they were on when the auth gate
// sent them to /login (carried as `?next=`). The value comes from the URL, so it
// is untrusted — accept only a path on this site, never another origin, or an
// attacker could use /login?next=https://evil.example as an open redirect.

export const DEFAULT_AFTER_SIGN_IN = "/home"

// Auth pages never make sense as a destination and could loop back here.
const AUTH_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/unlock-account",
]

const BASE = "https://same-site.invalid"
const MAX_LENGTH = 2000

/**
 * A same-site path (with its query and hash) that is safe to navigate to, or
 * null. Rejects absolute and protocol-relative URLs, backslash tricks,
 * control characters and auth pages.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > MAX_LENGTH) return null
  // Must be a root-relative path. "//host" and "/\host" are treated by
  // browsers as another origin.
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null
  // Control characters (incl. tab/newline, which URL parsing silently strips).
  if (/[\u0000-\u001f\u007f]/.test(raw)) return null

  let url: URL
  try {
    url = new URL(raw, BASE)
  } catch {
    return null
  }
  if (url.origin !== BASE) return null

  const path = url.pathname
  if (AUTH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return null
  }
  return `${path}${url.search}${url.hash}`
}

/** `/login`, carrying the current page so sign-in can return to it. */
export function loginHref(currentPathWithQuery: string): string {
  const next = safeNextPath(currentPathWithQuery)
  return next && next !== DEFAULT_AFTER_SIGN_IN
    ? `/login?next=${encodeURIComponent(next)}`
    : "/login"
}
