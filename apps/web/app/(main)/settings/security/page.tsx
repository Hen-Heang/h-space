"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Check, Copy, Download, Loader2, RefreshCw, ShieldCheck, ShieldOff } from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  MFA_ALREADY_ENABLED,
  MFA_CODE_INVALID,
  getApiErrorMessage,
  mfaApi,
  type MfaSetup,
} from "@/lib/api"
import { AuthApiError } from "@/lib/api/auth-http"
import { containerVariants, itemVariants } from "@/lib/motion"
import { cn } from "@/lib/utils"

// Two-step verification (TOTP) setup and management. h-space-api has no
// "is MFA on?" read, so opening the page starts setup once: a secret means
// it's off (and stays off until a live code confirms the app), and
// MFA_ALREADY_ENABLED means it's on. Backup codes are shown once, only in
// component state, and never written to storage.

type View =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "setup"; setup: MfaSetup }
  | { kind: "enabled" }
  | { kind: "backup-codes"; codes: string[]; reason: "enabled" | "regenerated" }
  | { kind: "disabled" }

const codeInputClass =
  "h-14 rounded-xl text-center text-xl font-semibold tracking-[0.4em] placeholder:tracking-[0.4em]"

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof AuthApiError && error.code === MFA_CODE_INVALID) {
    return "That code didn't match. Check your app and try the newest code."
  }
  return getApiErrorMessage(error, fallback)
}

// Base32 keys are easier to type in groups of four.
function groupKey(secret: string) {
  return secret
    .replace(/\s+/g, "")
    .replace(/(.{4})/g, "$1 ")
    .trim()
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  } catch {
    toast.error(`Couldn't copy the ${label.toLowerCase()}`, {
      description: "Select it and copy it by hand.",
    })
  }
}

function StepBadge({ n, done }: { n: number; done?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
        done ? "bg-emerald-500/15 text-emerald-600" : "bg-primary/10 text-primary",
      )}
    >
      {done ? <Check size={15} strokeWidth={2.5} /> : n}
    </span>
  )
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      variants={itemVariants}
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 dark:bg-slate-900/40",
        className,
      )}
    >
      {children}
    </motion.section>
  )
}

/** One code field + submit, used by enable, disable and regenerate. */
function CodeForm({
  id,
  label,
  hint,
  submitLabel,
  busyLabel,
  allowBackupCode,
  destructive,
  onSubmit,
}: {
  id: string
  label: string
  hint?: string
  submitLabel: string
  busyLabel: string
  allowBackupCode?: boolean
  destructive?: boolean
  onSubmit: (code: string) => Promise<void>
}) {
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmed = code.trim()
  // Authenticator codes are 6 digits; backup codes are longer and lettered.
  const ready = allowBackupCode ? trimmed.length >= 6 : /^\d{6}$/.test(trimmed)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    setError(null)
    try {
      await onSubmit(trimmed)
    } catch (err) {
      setError(errorMessage(err, "Something went wrong. Please try again."))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label htmlFor={id} className="block text-sm font-semibold text-foreground">
        {label}
      </label>
      <Input
        id={id}
        name="one-time-code"
        autoComplete="one-time-code"
        inputMode={allowBackupCode ? "text" : "numeric"}
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={allowBackupCode ? 32 : 6}
        placeholder="123456"
        value={code}
        onChange={(e) =>
          setCode(allowBackupCode ? e.target.value : e.target.value.replace(/\D/g, ""))
        }
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={codeInputClass}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs leading-relaxed text-muted-foreground">
            {hint}
          </p>
        )
      )}
      <Button
        type="submit"
        variant={destructive ? "destructive" : "default"}
        className="h-12 w-full rounded-xl text-sm font-semibold"
        disabled={!ready || busy}
      >
        {busy ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {busyLabel}
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  )
}

function SetupView({
  setup,
  onEnabled,
}: {
  setup: MfaSetup
  onEnabled: (codes: string[]) => void
}) {
  return (
    <>
      <Card>
        <div className="flex gap-4">
          <StepBadge n={1} />
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Scan the QR code</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Open your authenticator app, choose <strong>Add account</strong>, then scan this
                code with your phone camera.
              </p>
            </div>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              {setup.qrCodeImageBase64 ? (
                // A server-rendered data: URI; next/image adds nothing here.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/png;base64,${setup.qrCodeImageBase64}`}
                  alt="QR code for adding H-Space to your authenticator app"
                  width={176}
                  height={176}
                  className="size-44 shrink-0 rounded-xl border border-border bg-white p-2"
                />
              ) : (
                <div className="flex size-44 shrink-0 items-center justify-center rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  The QR code couldn&apos;t be drawn. Enter the key below instead.
                </div>
              )}
              <div className="w-full min-w-0 space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  Can&apos;t scan? Enter this key manually
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-accent/5 p-2 pl-3">
                  <code className="min-w-0 flex-1 break-all font-mono text-sm font-semibold tracking-wide text-foreground">
                    {groupKey(setup.secret)}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0"
                    aria-label="Copy setup key"
                    onClick={() => copyText(setup.secret, "Setup key")}
                  >
                    <Copy size={16} />
                  </Button>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Choose a time-based key if your app asks. Keep this key private.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex gap-4">
          <StepBadge n={2} />
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Enter the 6-digit code</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Type the code your app shows for H-Space. It refreshes about every 30 seconds.
              </p>
            </div>
            <CodeForm
              id="mfa-enable-code"
              label="Authenticator code"
              hint="After verifying, you'll get one-time backup codes. Save them somewhere safe — they're the only way in if you lose your phone."
              submitLabel="Verify and turn on"
              busyLabel="Verifying…"
              onSubmit={async (code) => onEnabled(await mfaApi.enable(code))}
            />
          </div>
        </div>
      </Card>

      <motion.p variants={itemVariants} className="text-center text-xs text-muted-foreground">
        You&apos;ll be asked for this code each time you sign in.
      </motion.p>
    </>
  )
}

function BackupCodesView({
  codes,
  reason,
}: {
  codes: string[]
  reason: "enabled" | "regenerated"
}) {
  const [saved, setSaved] = useState(false)
  const text = codes.join("\n")

  function download() {
    const blob = new Blob([`H-Space backup codes\nEach code works once.\n\n${text}\n`], {
      type: "text/plain",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "h-space-backup-codes.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {reason === "enabled" ? "Two-step verification is on" : "New backup codes ready"}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Save these backup codes now — they won&apos;t be shown again. Each one works once if you
            lose your authenticator.
            {reason === "regenerated" && " Your old backup codes no longer work."}
          </p>
        </div>
      </div>

      <ul
        aria-label="Backup codes"
        className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-accent/5 p-4 font-mono text-sm font-semibold text-foreground min-[400px]:grid-cols-2"
      >
        {codes.map((c) => (
          <li key={c} className="tracking-wide">
            {c}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => copyText(text, "Backup codes")}>
          <Copy size={15} />
          Copy
        </Button>
        <Button type="button" variant="outline" onClick={download}>
          <Download size={15} />
          Download
        </Button>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="size-4 accent-primary"
        />
        I&apos;ve saved my backup codes somewhere safe
      </label>

      {saved ? (
        <Button asChild className="h-12 w-full rounded-xl text-sm font-semibold">
          <Link href="/settings">Done</Link>
        </Button>
      ) : (
        <Button type="button" className="h-12 w-full rounded-xl text-sm font-semibold" disabled>
          Done
        </Button>
      )}
    </Card>
  )
}

function EnabledView({
  onRegenerated,
  onDisabled,
}: {
  onRegenerated: (codes: string[]) => void
  onDisabled: () => void
}) {
  return (
    <>
      <Card>
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Two-step verification is on</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Each sign-in asks for a code from your authenticator app, or one of your backup codes.
            </p>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-start gap-3">
          <RefreshCw size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
          <div>
            <h2 className="text-base font-semibold text-foreground">New backup codes</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Replaces all your backup codes. Use this if you&apos;ve used most of them or think
              they were seen.
            </p>
          </div>
        </div>
        <CodeForm
          id="mfa-regenerate-code"
          label="Authenticator or backup code"
          submitLabel="Get new backup codes"
          busyLabel="Generating…"
          allowBackupCode
          onSubmit={async (code) => onRegenerated(await mfaApi.regenerateBackupCodes(code))}
        />
      </Card>

      <Card className="space-y-4">
        <div className="flex items-start gap-3">
          <ShieldOff size={18} className="mt-0.5 shrink-0 text-destructive" />
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Turn off two-step verification
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Your account will be protected by your password or sign-in email only. Your
              authenticator link and backup codes stop working.
            </p>
          </div>
        </div>
        <CodeForm
          id="mfa-disable-code"
          label="Authenticator or backup code"
          submitLabel="Turn off"
          busyLabel="Turning off…"
          allowBackupCode
          destructive
          onSubmit={async (code) => {
            await mfaApi.disable(code)
            onDisabled()
          }}
        />
      </Card>
    </>
  )
}

async function loadView(): Promise<View> {
  try {
    return { kind: "setup", setup: await mfaApi.startSetup() }
  } catch (error) {
    if (error instanceof AuthApiError && error.code === MFA_ALREADY_ENABLED) {
      return { kind: "enabled" }
    }
    return {
      kind: "error",
      message: getApiErrorMessage(error, "Couldn't load two-step verification."),
    }
  }
}

export default function SecuritySettingsPage() {
  const [view, setView] = useState<View>({ kind: "loading" })
  // Each setup call replaces the pending secret, so a second call (React
  // dev double-mount) would leave the QR on screen out of date.
  const started = useRef(false)

  const restart = () => {
    setView({ kind: "loading" })
    void loadView().then(setView)
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    void loadView().then(setView)
  }, [])

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="mx-auto max-w-2xl space-y-5 pb-16"
    >
      <motion.div variants={itemVariants}>
        <BackLink href="/settings" label="Settings" desktopOnly />
        <div className="mt-2 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground">Two-step verification</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Link an authenticator app, such as Google Authenticator, to protect your account.
            </p>
          </div>
          {view.kind === "setup" && (
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link href="/settings">Set up later</Link>
            </Button>
          )}
        </div>
      </motion.div>

      {view.kind === "loading" && (
        <motion.div variants={itemVariants} className="space-y-4" aria-busy="true">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </motion.div>
      )}

      {view.kind === "error" && (
        <motion.div variants={itemVariants} className="space-y-3">
          <ErrorBanner>{view.message}</ErrorBanner>
          <Button type="button" variant="outline" onClick={restart}>
            Try again
          </Button>
        </motion.div>
      )}

      {view.kind === "setup" && (
        <SetupView
          setup={view.setup}
          onEnabled={(codes) => setView({ kind: "backup-codes", codes, reason: "enabled" })}
        />
      )}

      {view.kind === "backup-codes" && <BackupCodesView codes={view.codes} reason={view.reason} />}

      {view.kind === "enabled" && (
        <EnabledView
          onRegenerated={(codes) => setView({ kind: "backup-codes", codes, reason: "regenerated" })}
          onDisabled={() => setView({ kind: "disabled" })}
        />
      )}

      {view.kind === "disabled" && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Two-step verification is off
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              You can turn it back on at any time. You&apos;ll need to scan a new QR code.
            </p>
          </div>
          <Button type="button" onClick={restart}>
            Set up again
          </Button>
        </Card>
      )}
    </motion.div>
  )
}
