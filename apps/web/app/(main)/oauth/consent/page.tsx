"use client"

// Supabase's OAuth 2.1 server redirects here (its `authorization_url_path`,
// configured outside this repo) once the user has signed in, with an
// `authorization_id` query param identifying the pending request. This page
// is the only place a Hengo user decides whether an MCP connector (Claude,
// ChatGPT, ...) may act on their behalf — see docs/chatgpt-mcp-integration.md
// §3.4. No authorization code is ever issued without this step.
import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CircleCheck, KeyRound, Loader2, PenLine, ShieldOff } from "lucide-react"
import type { OAuthAuthorizationDetails } from "@supabase/supabase-js"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ErrorBanner } from "@/components/ui/error-banner"
import { supabase } from "@/lib/supabase"

// Plain-language, specific permission lines — never "full access" (AGENTS.md
// domain-neutrality rule extends to any user-facing copy naming what a
// connector can touch). Kept in sync by hand with the tool set registered in
// lib/mcp/tools/*: seven read tools always available, seven write tools only
// when the server has MCP_WRITE_ENABLED=true. Supabase's OAuth server has no
// custom read/write scope to gate this on (design doc §4.2), so both lines
// are shown for every connector — write tools may simply be absent from the
// connector's own tool list if the deployment has writes disabled.
const READ_PERMISSIONS = [
  "View your goals, tasks, and today's overview",
  "View your Korean-learning and weekly progress stats",
]
const WRITE_PERMISSIONS = [
  "Create and update tasks and goals, and mark tasks complete",
  "Capture a reflection note or save a Korean word or phrase you mention",
]

type ConsentState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "redirecting" }
  | { kind: "ready"; details: OAuthAuthorizationDetails; submitting: "approve" | "deny" | null }
  | { kind: "denied" }

function isAuthorizationDetails(
  data: OAuthAuthorizationDetails | { redirect_url: string },
): data is OAuthAuthorizationDetails {
  return "authorization_id" in data
}

function ConsentCard() {
  const searchParams = useSearchParams()
  const authorizationId = searchParams.get("authorization_id")?.trim() ?? ""
  const [state, setState] = useState<ConsentState>({ kind: "loading" })

  useEffect(() => {
    // No id at all is a render-time fact about this visit, not something to
    // synchronize via an effect — handled directly below, before this runs.
    if (!authorizationId) return
    let cancelled = false
    supabase.auth.oauth.getAuthorizationDetails(authorizationId).then(({ data, error }) => {
      if (cancelled) return
      if (error || !data) {
        setState({
          kind: "error",
          message: error?.message || "This authorization link is invalid or has expired.",
        })
        return
      }
      if (isAuthorizationDetails(data)) {
        setState({ kind: "ready", details: data, submitting: null })
        return
      }
      // Already consented for these scopes (or just approved/denied) —
      // Supabase hands back a ready-to-use redirect rather than asking again.
      setState({ kind: "redirecting" })
      window.location.href = data.redirect_url
    })
    return () => {
      cancelled = true
    }
  }, [authorizationId])

  const decide = useCallback(
    async (decision: "approve" | "deny") => {
      if (state.kind !== "ready") return
      const { details } = state
      setState({ kind: "ready", details, submitting: decision })
      const call =
        decision === "approve"
          ? supabase.auth.oauth.approveAuthorization
          : supabase.auth.oauth.denyAuthorization
      const { data, error } = await call(details.authorization_id, { skipBrowserRedirect: true })
      if (error || !data) {
        setState({
          kind: "error",
          message:
            error?.message || "Something went wrong recording your decision. Please try again.",
        })
        return
      }
      if (decision === "deny") {
        setState({ kind: "denied" })
        return
      }
      window.location.href = data.redirect_url
    },
    [state],
  )

  if (!authorizationId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Missing authorization link</CardTitle>
          <CardDescription>
            This page needs to be opened from a connector&apos;s sign-in flow — it isn&apos;t meant
            to be visited directly.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (state.kind === "loading" || state.kind === "redirecting") {
    return (
      <Card className="items-center py-10 text-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          {state.kind === "redirecting"
            ? "You've already decided — returning you now…"
            : "Loading authorization request…"}
        </p>
      </Card>
    )
  }

  if (state.kind === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Can&apos;t show this request</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorBanner>{state.message}</ErrorBanner>
        </CardContent>
      </Card>
    )
  }

  if (state.kind === "denied") {
    return (
      <Card className="items-center py-10 text-center">
        <ShieldOff className="size-6 text-muted-foreground" aria-hidden />
        <CardTitle>Access denied</CardTitle>
        <CardDescription>
          You can close this tab. The connector was not given access to your Hengo account.
        </CardDescription>
      </Card>
    )
  }

  // Only "ready" reaches here (missing id, loading, error, redirecting and
  // denied all returned above).
  const { details, submitting } = state

  return (
    <Card>
      <CardHeader>
        <CardTitle>Let &ldquo;{details.client.name}&rdquo; connect to Hengo?</CardTitle>
        <CardDescription>
          This connector will be able to act on your Hengo account as you, using your own sign-in.
          You can revoke access at any time from Supabase&apos;s connected-apps settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <section aria-labelledby="consent-read-heading" className="space-y-2">
          <h3
            id="consent-read-heading"
            className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
          >
            <KeyRound className="size-4" aria-hidden /> Can read
          </h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {READ_PERMISSIONS.map((line) => (
              <li key={line} className="flex gap-2">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="consent-write-heading" className="space-y-2">
          <h3
            id="consent-write-heading"
            className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
          >
            <PenLine className="size-4" aria-hidden /> Can create or change (only if write access is
            enabled for this deployment)
          </h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {WRITE_PERMISSIONS.map((line) => (
              <li key={line} className="flex gap-2">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </section>
        <p className="text-xs text-muted-foreground">
          This connector never deletes anything and never sees your recovery, mood, or journal
          entries.
        </p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" onClick={() => decide("deny")} disabled={submitting !== null}>
          {submitting === "deny" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Deny
        </Button>
        <Button onClick={() => decide("approve")} disabled={submitting !== null}>
          {submitting === "approve" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          Approve
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function OAuthConsentPage() {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md items-center justify-center px-4 py-10">
      <div className="w-full">
        <Suspense
          fallback={
            <Card className="items-center py-10 text-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
            </Card>
          }
        >
          <ConsentCard />
        </Suspense>
      </div>
    </div>
  )
}
