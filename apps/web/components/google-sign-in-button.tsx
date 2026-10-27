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
  redirectTo = "/home",
}: {
  onError?: (message: string) => void
  redirectTo?: string
}) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

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
              await handleGoogleCredential(response.credential)
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
