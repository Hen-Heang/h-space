"use client"

import { useState } from "react"
import { Check, Copy, Eye, EyeOff, KeyRound, Loader2, LockKeyhole } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { VaultKeysetRecord } from "@/lib/api"
import {
  createVaultKeyset,
  MIN_MASTER_PASSWORD_LENGTH,
  recoverWithRecoveryKey,
  unlockWithMasterPassword,
  VaultDecryptError,
  type VaultKey,
  type VaultKeysetData,
} from "@/lib/vault-crypto"

type Mode = "setup" | "unlock" | "recover"

/**
 * Everything that turns a master password (or the recovery key) into the
 * unlocked vault key, in the browser (lib/vault-crypto.ts):
 * - no keyset yet → set up: create a master password, then see the recovery
 *   key exactly once;
 * - otherwise → unlock with the master password, or recover with the recovery
 *   key and choose a new master password;
 * - neither available → reset, which deletes what only that key could read.
 *
 * Nothing typed here is stored or sent: only the wrapped keys from
 * lib/vault-crypto.ts reach `saveKeyset`.
 */
export function VaultUnlockDialog({
  open,
  userId,
  keyset,
  live,
  saveKeyset,
  onReset,
  onUnlocked,
  onCancel,
}: {
  open: boolean
  userId: string
  keyset: VaultKeysetRecord | null
  /** Whether a reset deletes whole accounts (hspace-api) or just saved passwords (demo). */
  live: boolean
  saveKeyset: (data: VaultKeysetData, version: number | null) => Promise<VaultKeysetRecord>
  onReset: () => Promise<void>
  onUnlocked: (key: VaultKey) => void
  onCancel: () => void
}) {
  const [choice, setChoice] = useState<Mode>("unlock")
  const mode: Mode = keyset == null ? "setup" : choice
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [recoveryInput, setRecoveryInput] = useState("")
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetError, setResetError] = useState("")
  // After setup: the recovery key to show once, and the key to hand over
  // only when the user confirms they've saved it.
  const [created, setCreated] = useState<{ recoveryKey: string; vaultKey: VaultKey } | null>(null)

  const clear = () => {
    setPassword("")
    setConfirm("")
    setRecoveryInput("")
    setVisible(false)
    setError("")
  }

  const cancel = () => {
    if (busy || created) return
    clear()
    setChoice("unlock")
    onCancel()
  }

  const needsNewPassword = mode === "setup" || mode === "recover"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError("")
    if (needsNewPassword) {
      if (password.length < MIN_MASTER_PASSWORD_LENGTH) {
        setError(`Use at least ${MIN_MASTER_PASSWORD_LENGTH} characters.`)
        return
      }
      if (password !== confirm) {
        setError("The two passwords don't match.")
        return
      }
    }
    setBusy(true)
    try {
      if (mode === "setup") {
        const result = await createVaultKeyset(password, userId)
        await saveKeyset(result.keyset, null)
        clear()
        setCreated({ recoveryKey: result.recoveryKey, vaultKey: result.vaultKey })
      } else if (mode === "recover" && keyset) {
        const result = await recoverWithRecoveryKey(keyset, recoveryInput, password, userId)
        await saveKeyset(result.keyset, keyset.version)
        clear()
        setChoice("unlock")
        onUnlocked(result.vaultKey)
      } else if (keyset) {
        const key = await unlockWithMasterPassword(keyset, password, userId)
        clear()
        onUnlocked(key)
      }
    } catch (err) {
      setError(
        err instanceof VaultDecryptError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Couldn't unlock.",
      )
    } finally {
      setBusy(false)
    }
  }

  const handleReset = async () => {
    if (busy) return
    setBusy(true)
    setResetError("")
    try {
      await onReset()
      setConfirmReset(false)
      setChoice("unlock")
      clear()
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Couldn't reset the vault.")
    } finally {
      setBusy(false)
    }
  }

  if (created) {
    return (
      <RecoveryKeyStep
        open={open}
        recoveryKey={created.recoveryKey}
        onDone={() => {
          const key = created.vaultKey
          setCreated(null)
          onUnlocked(key)
        }}
      />
    )
  }

  const title =
    mode === "setup"
      ? "Set up your vault"
      : mode === "recover"
        ? "Use your recovery key"
        : "Unlock your vault"
  const description =
    mode === "setup"
      ? "Create a master password. It encrypts your vault in this browser and is never saved or sent anywhere. Next you'll get a recovery key — the only way back in if you forget it."
      : mode === "recover"
        ? "Enter the recovery key you saved when you set up the vault, then choose a new master password. Nothing in your vault is lost."
        : "Enter your master password. The vault stays unlocked in this tab and locks again after 10 minutes of inactivity."

  return (
    <Dialog open={open} onOpenChange={(next) => !next && cancel()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LockKeyhole className="size-5 text-primary" aria-hidden="true" />
              {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {mode === "recover" && (
            <div className="space-y-2">
              <label htmlFor="vault-recovery-key" className="text-sm font-semibold">
                Recovery key
              </label>
              <Input
                id="vault-recovery-key"
                value={recoveryInput}
                onChange={(e) => setRecoveryInput(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                autoFocus
                placeholder="XXXX-XXXX-…"
                className="font-mono"
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="vault-master-password" className="text-sm font-semibold">
              {mode === "recover" ? "New master password" : "Master password"}
            </label>
            <div className="relative">
              <Input
                id="vault-master-password"
                type={visible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={needsNewPassword ? "new-password" : "current-password"}
                autoFocus={mode !== "recover"}
                className="pr-12"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "vault-unlock-error" : undefined}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? "Hide master password" : "Show master password"}
                className="absolute top-1/2 right-1 -translate-y-1/2"
              >
                {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </Button>
            </div>
          </div>

          {needsNewPassword && (
            <div className="space-y-2">
              <label htmlFor="vault-master-confirm" className="text-sm font-semibold">
                Confirm master password
              </label>
              <Input
                id="vault-master-confirm"
                type={visible ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">
                At least {MIN_MASTER_PASSWORD_LENGTH} characters. A short sentence works well.
                Don&apos;t reuse your H-Space sign-in password.
              </p>
            </div>
          )}

          {error && (
            <p
              id="vault-unlock-error"
              role="alert"
              className="text-sm font-semibold text-destructive"
            >
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={cancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || !password || (mode === "recover" && !recoveryInput)}
            >
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              {mode === "setup"
                ? "Create vault"
                : mode === "recover"
                  ? "Recover and unlock"
                  : "Unlock"}
            </Button>
          </DialogFooter>

          {mode !== "setup" && (
            <div className="flex flex-col items-center gap-1 text-center">
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-sm text-muted-foreground"
                onClick={() => {
                  clear()
                  setChoice(mode === "recover" ? "unlock" : "recover")
                }}
                disabled={busy}
              >
                {mode === "recover"
                  ? "Use my master password instead"
                  : "Forgot master password? Use your recovery key"}
              </Button>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-sm text-muted-foreground"
                onClick={() => setConfirmReset(true)}
                disabled={busy}
              >
                Lost both? Reset the vault
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
      <AlertDialog open={confirmReset} onOpenChange={(next) => !busy && setConfirmReset(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the vault?</AlertDialogTitle>
            <AlertDialogDescription>
              {live
                ? "This permanently deletes every account saved in H-Vault. Without your master password or recovery key nobody can read them — not even H-Space. You'll start with an empty vault."
                : "This permanently removes every saved encrypted password. Account names, usernames, and links stay."}{" "}
              Continue only after resetting those accounts on their own websites if you need to.
            </AlertDialogDescription>
            {resetError && (
              <p role="alert" className="text-sm font-semibold text-destructive">
                {resetError}
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setConfirmReset(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReset} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {busy ? "Resetting…" : live ? "Delete everything" : "Clear saved passwords"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}

/**
 * Shows the new recovery key once. It can't be closed until the user confirms
 * they've saved it: there's no way to show it again.
 */
function RecoveryKeyStep({
  open,
  recoveryKey,
  onDone,
}: {
  open: boolean
  recoveryKey: string
  onDone: () => void
}) {
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryKey)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" aria-hidden="true" />
            Save your recovery key
          </DialogTitle>
          <DialogDescription>
            If you forget your master password, this key is the only way back into your vault. It
            won&apos;t be shown again. Print it or write it down and keep it somewhere safe and
            offline — anyone who has it can open your vault.
          </DialogDescription>
        </DialogHeader>
        <p
          aria-label="Recovery key"
          className="rounded-xl border border-border bg-muted/50 px-4 py-3 font-mono text-sm leading-7 tracking-wide break-all select-all"
        >
          {recoveryKey}
        </p>
        <Button type="button" variant="outline" onClick={copy}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? "Copied" : "Copy recovery key"}
        </Button>
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
            className="mt-1 size-4"
          />
          <span>I&apos;ve saved my recovery key somewhere safe.</span>
        </label>
        <DialogFooter>
          <Button type="button" disabled={!saved} onClick={onDone}>
            Open my vault
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
