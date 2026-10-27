"use client"

import { MailCheck } from "lucide-react"

import { TokenLinkAction } from "@/components/auth/token-link-action"
import { authApi } from "@/lib/api"

// h-space-api ExitCode.EMAIL_ALREADY_VERIFIED: the link was used before, so
// the address is verified either way.
const EMAIL_ALREADY_VERIFIED = 1403
const ALREADY_DONE = [EMAIL_ALREADY_VERIFIED]

// Landing page for the link h-space-api emails after password sign-up.
// A password login is refused until the address is verified.
export default function VerifyEmailPage() {
  return (
    <TokenLinkAction
      action={authApi.verifyEmail}
      workingLabel="Verifying your email…"
      done={{
        icon: MailCheck,
        title: "Email verified",
        description: "Your account is ready. Sign in with your email or username and password.",
      }}
      failedTitle="Link expired"
      failedDescription="This verification link is invalid or has expired. Enter your email to get a new one."
      alreadyDoneCodes={ALREADY_DONE}
      resend={{
        label: "Send a new verification link",
        send: authApi.resendVerification,
        sentMessage:
          "If that email has an account waiting for verification, a new link is on its way.",
      }}
    />
  )
}
