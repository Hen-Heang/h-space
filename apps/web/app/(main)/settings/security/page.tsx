"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  Check,
  Copy,
  Loader2,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
} from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

import { MfaDevicePicker } from "@/components/auth/mfa-device-picker"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  MFA_CODE_INVALID,
  MFA_DEVICE_NAME_MAX,
  MFA_NAME_TAKEN,
  getApiErrorMessage,
  mfaApi,
  newDeviceName,
  type MfaDevice,
  type MfaSetup,
} from "@/lib/api"
import { containerVariants, itemVariants } from "@/lib/motion"
import { cn } from "@/lib/utils"

// Two-step verification (TOTP) over Supabase Auth MFA. Supabase has no backup
// codes, so the backup is a second authenticator: the page lists linked
// devices, adds more (name → QR → confirm with a live code) and removes one
// with a code from any linked device — so a lost phone can be removed with the
// backup. Removing the last device turns two-step verification off. The secret
// and QR code live only in component state.

type View =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "list"; devices: MfaDevice[] }
  | { kind: "name"; devices: MfaDevice[] }
  | { kind: "setup"; devices: MfaDevice[]; setup: MfaSetup }
  | { kind: "remove"; devices: MfaDevice[]; target: MfaDevice }

const codeInputClass =
  "h-14 rounded-xl text-center text-xl font-semibold tracking-[0.4em] placeholder:tracking-[0.4em]"

function errorMessage(error: unknown, fallback: string) {
  const code = (error as { code?: unknown } | null)?.code
  if (code === MFA_CODE_INVALID) {
    return "That code didn't match. Check the app and try the newest code."
  }
  if (code === MFA_NAME_TAKEN) return "You already have an authenticator with that name."
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

function formatAdded(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? ""
    : `Added ${date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}`
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
      {done ? <Check size={15} /> : n}
    </span>
  )
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section variants={itemVariants} className={cn("app-surface p-5 sm:p-6", className)}>
      {children}
    </motion.section>
  )
}

/** One 6-digit code field + submit, used to confirm and to remove. */
function CodeForm({
  id,
  label,
  hint,
  submitLabel,
  busyLabel,
  destructive,
  onSubmit,
}: {
  id: string
  label: string
  hint?: string
  submitLabel: string
  busyLabel: string
  destructive?: boolean
  onSubmit: (code: string) => Promise<void>
}) {
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmed = code.trim()
  const ready = /^\d{6}$/.test(trimmed)

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
        inputMode="numeric"
        spellCheck={false}
        maxLength={6}
        placeholder="123456"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
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

function NameView({
  devices,
  onReady,
  onCancel,
}: {
  devices: MfaDevice[]
  onReady: (setup: MfaSetup) => void
  onCancel: () => void
}) {
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isBackup = devices.length > 0

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      onReady(await mfaApi.startSetup(newDeviceName(name, devices)))
    } catch (err) {
      setError(errorMessage(err, "Couldn't start setup. Please try again."))
      setBusy(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {isBackup ? "Add a backup authenticator" : "Name this authenticator"}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {isBackup
              ? "Use a different device than your first one — a tablet, an old phone, or a second app — so losing one doesn't lock you out."
              : "A name helps you tell your devices apart later, for example “iPhone”."}
          </p>
        </div>
        <div className="space-y-2">
          <label htmlFor="mfa-device-name" className="block text-sm font-semibold text-foreground">
            Device name <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="mfa-device-name"
            value={name}
            maxLength={MFA_DEVICE_NAME_MAX}
            placeholder={isBackup ? "iPad" : "iPhone"}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "mfa-device-name-error" : undefined}
            autoFocus
            className="h-12 rounded-xl"
          />
          {error && (
            <p
              id="mfa-device-name-error"
              role="alert"
              className="text-sm font-medium text-destructive"
            >
              {error}
            </p>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {isBackup && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={busy} className="h-11 rounded-xl">
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Preparing…
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function SetupView({
  setup,
  isBackup,
  onConfirmed,
  onCancel,
}: {
  setup: MfaSetup
  isBackup: boolean
  onConfirmed: () => void
  onCancel: () => void
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
                Open your authenticator app{isBackup ? " on the backup device" : ""}, choose{" "}
                <strong>Add account</strong>, then scan this code with the camera.
              </p>
            </div>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              {setup.qrCode ? (
                // Supabase's data:image/svg+xml URI; next/image adds nothing here.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={setup.qrCode}
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
                Type the code this app now shows for H-Space. It refreshes about every 30 seconds.
              </p>
            </div>
            <CodeForm
              id="mfa-confirm-code"
              label="Authenticator code"
              hint={
                isBackup
                  ? undefined
                  : "Then add a backup authenticator too — there are no backup codes, and it's what gets you in if you lose this device."
              }
              submitLabel={isBackup ? "Verify and add" : "Verify and turn on"}
              busyLabel="Verifying…"
              onSubmit={async (code) => {
                await mfaApi.confirm(setup.factorId, code)
                onConfirmed()
              }}
            />
          </div>
        </div>
      </Card>

      <motion.div variants={itemVariants} className="text-center">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </motion.div>
    </>
  )
}

function DeviceListView({
  devices,
  onAdd,
  onRemove,
}: {
  devices: MfaDevice[]
  onAdd: () => void
  onRemove: (device: MfaDevice) => void
}) {
  const single = devices.length === 1
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
              Each sign-in asks for a code from one of your authenticators.
            </p>
          </div>
        </div>
      </Card>

      {single && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Add a backup</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  With only one authenticator, losing that device locks you out of two-step
                  verification. A second one on another device is your backup.
                </p>
              </div>
              <Button type="button" onClick={onAdd} className="h-11 rounded-xl">
                <Plus size={16} />
                Add a backup authenticator
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Your authenticators</h2>
        <ul className="divide-y divide-border">
          {devices.map((device) => (
            <li key={device.factorId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <Smartphone size={18} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{device.name}</p>
                <p className="text-xs text-muted-foreground">{formatAdded(device.createdAt)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-11 shrink-0 text-destructive hover:text-destructive"
                onClick={() => onRemove(device)}
                aria-label={`Remove ${device.name}`}
              >
                <Trash2 size={15} />
                Remove
              </Button>
            </li>
          ))}
        </ul>
        {!single && (
          <Button
            type="button"
            variant="outline"
            onClick={onAdd}
            className="h-11 w-full rounded-xl"
          >
            <Plus size={16} />
            Add another authenticator
          </Button>
        )}
      </Card>
    </>
  )
}

function RemoveView({
  devices,
  target,
  onRemoved,
  onCancel,
}: {
  devices: MfaDevice[]
  target: MfaDevice
  onRemoved: () => void
  onCancel: () => void
}) {
  // Default to another device: the usual reason to remove one is that it's lost.
  const [verifyWith, setVerifyWith] = useState(
    devices.find((d) => d.factorId !== target.factorId)?.factorId ?? target.factorId,
  )
  const last = devices.length === 1

  return (
    <Card className="space-y-4">
      <div className="flex items-start gap-3">
        <Trash2 size={18} className="mt-0.5 shrink-0 text-destructive" />
        <div>
          <h2 className="text-base font-semibold text-foreground">Remove “{target.name}”</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {last
              ? "This is your only authenticator, so removing it turns two-step verification off. Your account is then protected by your password or sign-in email only, and H-Vault needs two-step verification."
              : "Its codes stop working. Confirm with a code from any of your authenticators — another device works if this one is lost."}
          </p>
        </div>
      </div>
      <MfaDevicePicker
        devices={devices}
        value={verifyWith}
        onChange={setVerifyWith}
        label="Confirm with a code from"
      />
      <CodeForm
        id="mfa-remove-code"
        label="Authenticator code"
        submitLabel={last ? "Turn off two-step verification" : "Remove authenticator"}
        busyLabel="Removing…"
        destructive
        onSubmit={async (code) => {
          await mfaApi.remove(target.factorId, verifyWith, code)
          onRemoved()
        }}
      />
      <Button type="button" variant="ghost" onClick={onCancel} className="w-full">
        Cancel
      </Button>
    </Card>
  )
}

async function loadView(): Promise<View> {
  try {
    const devices = await mfaApi.devices()
    return devices.length > 0 ? { kind: "list", devices } : { kind: "name", devices }
  } catch (error) {
    return {
      kind: "error",
      message: getApiErrorMessage(error, "Couldn't load two-step verification."),
    }
  }
}

export default function SecuritySettingsPage() {
  const [view, setView] = useState<View>({ kind: "loading" })
  const started = useRef(false)

  const reload = useCallback(() => {
    setView({ kind: "loading" })
    void loadView().then(setView)
  }, [])

  useEffect(() => {
    if (started.current) return
    started.current = true
    void loadView().then(setView)
  }, [])

  const backToList = () => reload()

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
            <h2 className="text-lg font-semibold text-foreground">Two-step verification</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Link an authenticator app, such as Google Authenticator, to protect your account.
            </p>
          </div>
          {view.kind === "name" && view.devices.length === 0 && (
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link href="/settings">Set up later</Link>
            </Button>
          )}
        </div>
      </motion.div>

      {view.kind === "loading" && (
        <motion.div variants={itemVariants} className="space-y-4" aria-busy="true">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </motion.div>
      )}

      {view.kind === "error" && (
        <motion.div variants={itemVariants} className="space-y-3">
          <ErrorBanner>{view.message}</ErrorBanner>
          <Button type="button" variant="outline" onClick={backToList}>
            Try again
          </Button>
        </motion.div>
      )}

      {view.kind === "list" && (
        <DeviceListView
          devices={view.devices}
          onAdd={() => setView({ kind: "name", devices: view.devices })}
          onRemove={(target) => setView({ kind: "remove", devices: view.devices, target })}
        />
      )}

      {view.kind === "name" && (
        <NameView
          devices={view.devices}
          onReady={(setup) => setView({ kind: "setup", devices: view.devices, setup })}
          onCancel={backToList}
        />
      )}

      {view.kind === "setup" && (
        <SetupView
          setup={view.setup}
          isBackup={view.devices.length > 0}
          onConfirmed={() => {
            toast.success("Authenticator linked")
            reload()
          }}
          onCancel={backToList}
        />
      )}

      {view.kind === "remove" && (
        <RemoveView
          devices={view.devices}
          target={view.target}
          onRemoved={() => {
            toast.success(
              view.devices.length === 1
                ? "Two-step verification is off"
                : `Removed “${view.target.name}”`,
            )
            reload()
          }}
          onCancel={backToList}
        />
      )}
    </motion.div>
  )
}
