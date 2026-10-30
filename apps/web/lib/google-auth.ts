import { authApi, type SignInResult } from "@/lib/api"

const GIS_SRC = "https://accounts.google.com/gsi/client"

let scriptPromise: Promise<void> | null = null

/** Loads the Google Identity Services script once and resolves when ready. */
export function loadGoogleScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve()
      return
    }
    const script = document.createElement("script")
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"))
    document.head.appendChild(script)
  })
  return scriptPromise
}

/**
 * Produces a nonce pair for the Google One Tap flow. Google is initialized with the
 * SHA-256 hash; the raw value can be forwarded to the backend to confirm they match
 * (replay protection).
 */
export async function makeNonce(): Promise<{ nonce: string; hashedNonce: string }> {
  const random = crypto.getRandomValues(new Uint8Array(32))
  const nonce = btoa(String.fromCharCode(...random)).replace(/[+/=]/g, "")
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce))
  const hashedNonce = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  return { nonce, hashedNonce }
}

/**
 * Establishes an h-space-api session from a Google credential (ID token).
 * h-space-api verifies it against the client IDs in its `google.client-ids`
 * setting, which must include NEXT_PUBLIC_GOOGLE_CLIENT_ID. Like a password,
 * Google is only the first factor: an account with two-step verification
 * answers mfa_required, finished with authApi.verifyMfa.
 */
export function handleGoogleCredential(credential: string): Promise<SignInResult> {
  return authApi.loginWithGoogle(credential)
}
