"use client"

import { Github, Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { isGitHubSignInEnabled } from "@/lib/auth-v2"
import { GITHUB_SIGN_IN_FAILED, startGitHubSignIn } from "@/lib/github-auth"

/**
 * "Continue with GitHub" (Auth V2 G1). Renders nothing unless
 * NEXT_PUBLIC_FEATURE_GITHUB_SIGN_IN=true; the existing Google, password and
 * email-code methods don't depend on it.
 */
export function GitHubSignInButton({
  next,
  onError,
}: {
  next: string | null
  onError?: (message: string) => void
}) {
  const [busy, setBusy] = useState(false)
  if (!isGitHubSignInEnabled()) return null

  return (
    <Button
      type="button"
      variant="outline"
      disabled={busy}
      className="mt-3 h-11 w-full gap-2"
      onClick={() => {
        setBusy(true)
        startGitHubSignIn(next).catch(() => {
          setBusy(false)
          onError?.(GITHUB_SIGN_IN_FAILED)
        })
      }}
    >
      {busy ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <Github aria-hidden="true" />
      )}
      Continue with GitHub
    </Button>
  )
}
