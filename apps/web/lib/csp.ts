// Content-Security-Policy for apps/web (h-space-api docs/vault-design.md,
// threat T5). H-Vault decrypts in the browser, so the page itself is the
// boundary: if injected script runs, it could read an unlocked vault. The
// policy limits what such code could do — above all `connect-src`, which stops
// decrypted data being sent anywhere but the services listed here — and keeps
// third-party script origins to Google sign-in alone.
//
// Next.js's inline bootstrap scripts need 'unsafe-inline' unless every page
// is rendered with a per-request nonce; that's a bigger change, tracked
// separately. Framework-free and tested (lib/csp.test.ts).

export type CspEnv = {
  supabaseUrl?: string
  authApiUrl?: string
  hspaceApiUrl?: string
  /** `next dev`: React needs eval and the dev server a websocket. */
  development?: boolean
  /** Vercel preview deployments inject the Vercel toolbar. */
  vercelPreview?: boolean
}

function origin(url: string | undefined): string | null {
  if (!url?.trim()) return null
  try {
    return new URL(url.trim()).origin
  } catch {
    return null
  }
}

const GOOGLE_SIGN_IN = "https://accounts.google.com/gsi/"

export function buildContentSecurityPolicy(env: CspEnv): string {
  const supabase = origin(env.supabaseUrl)
  const api = [origin(env.authApiUrl) ?? "http://localhost:8080", origin(env.hspaceApiUrl)]
  const preview = env.vercelPreview ? ["https://vercel.live"] : []

  const directives: Record<string, Array<string | null | false | undefined>> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      env.development && "'unsafe-eval'",
      `${GOOGLE_SIGN_IN}client`,
      ...preview,
    ],
    "style-src": ["'self'", "'unsafe-inline'", `${GOOGLE_SIGN_IN}style`],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      supabase,
      supabase && supabase.replace(/^https:/, "wss:"),
      ...api,
      GOOGLE_SIGN_IN,
      // Voice coach (WebRTC session set-up) and the calendar's weather badge.
      "https://api.openai.com",
      "https://api.open-meteo.com",
      env.development && "ws:",
      ...preview,
    ],
    "media-src": ["'self'", "blob:", "data:"],
    "frame-src": [GOOGLE_SIGN_IN, ...preview],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  }

  const policy = Object.entries(directives).map(([name, values]) => {
    const unique = [...new Set(values.filter((v): v is string => Boolean(v)))]
    return `${name} ${unique.join(" ")}`
  })
  if (!env.development) policy.push("upgrade-insecure-requests")
  return policy.join("; ")
}
