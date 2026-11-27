"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

import { AuthAlert, AuthHeading, AuthShell, authLinkClass } from "@/components/auth/auth-shell"
import { isGitHubSignInEnabled } from "@/lib/auth-v2"
import { finishGitHubSignIn, GITHUB_SIGN_IN_FAILED, parseGitHubCallback } from "@/lib/github-auth"
import { DEFAULT_AFTER_SIGN_IN, loginHref } from "@/lib/safe-next-path"

// Where Supabase returns the browser after the optional GitHub sign-in (Auth
// V2 G1). Not the provider's own callback (that is Supabase's
// /auth/v1/callback). Off unless NEXT_PUBLIC_FEATURE_GITHUB_SIGN_IN=true.

type Outcome = { redirect: string } | { error: string }

/** Reads and clears the callback URL, then finishes the sign-in. Never throws. */
async function finishCallback(): Promise<Outcome> {
  if (!isGitHubSignInEnabled()) return { error: "GitHub sign-in isn't enabled for H-Space." }
  const callback = parseGitHubCallback(window.location.search)
  // Drop the one-time code from the address bar and history straight away.
  window.history.replaceState(null, "", "/auth/callback")
  if (callback.kind !== "code") return { error: GITHUB_SIGN_IN_FAILED }
  const next = callback.next ?? DEFAULT_AFTER_SIGN_IN
  try {
    const result = await finishGitHubSignIn(callback.code)
    // The code step is on the sign-in page, which resumes a half-finished sign-in.
    return { redirect: result.status === "mfa_required" ? loginHref(next) : next }
  } catch (e) {
    return { error: e instanceof Error ? e.message : GITHUB_SIGN_IN_FAILED }
  }
}

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    // One exchange per page load, even if the effect runs twice in dev.
    if (started.current) return
    started.current = true
    void finishCallback().then((outcome) => {
      if ("redirect" in outcome) router.replace(outcome.redirect)
      else setError(outcome.error)
    })
  }, [router])

  return (
    <AuthShell>
      <AuthHeading
        title={error ? "Sign-in didn't finish" : "Signing you in…"}
        description={error ? undefined : "Finishing GitHub sign-in."}
      />
      {error ? (
        <>
          <AuthAlert>{error}</AuthAlert>
          <Link href="/login" className={`${authLinkClass} mt-6 block text-center text-sm`}>
            Back to sign in
          </Link>
        </>
      ) : (
        <p
          role="status"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          One moment…
        </p>
      )}
    </AuthShell>
  )
}
