"use client"

import { LockOpen } from "lucide-react"

import { TokenLinkAction } from "@/components/auth/token-link-action"
import { authApi } from "@/lib/api"

// Landing page for the link h-space-api emails when repeated failed logins
// lock an account. A valid token unlocks even if the lock already lapsed.
export default function UnlockAccountPage() {
  return (
    <TokenLinkAction
      action={authApi.unlockAccount}
      workingLabel="Unlocking your account…"
      done={{
        icon: LockOpen,
        title: "Account unlocked",
        description:
          "You can sign in again. If you didn't make those failed attempts, change your password.",
      }}
      failedTitle="Link expired"
      failedDescription="This unlock link is invalid or has expired. Enter your email to get a new one — or wait, the lock lifts on its own."
      resend={{
        label: "Send a new unlock link",
        send: authApi.resendUnlockLink,
        sentMessage: "If that email has a locked account, a new unlock link is on its way.",
      }}
    />
  )
}
