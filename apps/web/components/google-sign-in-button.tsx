"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

import { handleGoogleCredential, loadGoogleScript, makeNonce } from "@/lib/google-auth"

// Minimal typing for the Google Identity Services global.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
        }
      }
    }
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

export function GoogleSignInButton({
  onError,
  onMfaRequired,
  redirectTo = "/home",
}: {
  onError?: (message: string) => void
  /** The Google account has two-step verification; finish with authApi.verifyMfa. */
  onMfaRequired?: (mfaToken: string) => void
  redirectTo?: string
}) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  // Read at callback time, so an inline handler doesn't re-initialize Google
  // Identity Services on every render.
  const onMfaRequiredRef = useRef(onMfaRequired)
  useEffect(() => {
    onMfaRequiredRef.current = onMfaRequired
  })

  useEffect(() => {
    if (!CLIENT_ID) {
      onError?.("Google sign-in is not configured (missing NEXT_PUBLIC_GOOGLE_CLIENT_ID).")
      return
    }

    let cancelled = false

    void (async () => {
      try {
        await loadGoogleScript()
        if (cancelled || !containerRef.current || !window.google) return

        // h-space-api doesn't check the nonce yet; Google still embeds it, so
        // the token is ready for that check once the backend adds it.
        const { hashedNonce } = await makeNonce()

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          nonce: hashedNonce,
          callback: async (response: { credential: string }) => {
            try {
              const result = await handleGoogleCredential(response.credential)
              if (result.status === "mfa_required") {
                const handleMfa = onMfaRequiredRef.current
                if (handleMfa) handleMfa(result.mfaToken)
                else onError?.("Two-step verification is required. Sign in from the login page.")
                return
              }
              router.push(redirectTo)
            } catch (error) {
              onError?.(error instanceof Error ? error.message : "Google sign-in failed.")
            }
          },
        })

        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: 360,
        })
      } catch (error) {
        onError?.(error instanceof Error ? error.message : "Could not load Google sign-in.")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [router, onError, redirectTo])

  return <div ref={containerRef} className="flex justify-center" />
}
