"use client"

import { useState } from "react"
import { Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react"

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
import {
  MIN_MASTER_PASSWORD_LENGTH,
  unlockVault,
  VaultDecryptError,
  type VaultKey,
} from "@/lib/vault-crypto"

/**
 * Asks for the master password and derives the vault key in the browser.
 * `existingEnvelope` null → first time: the user creates a master password
 * (typed twice). Otherwise the password is proven against that envelope, so a
 * typo can't start encrypting under a different key.
 */
export function VaultUnlockDialog({
  open,
  existingEnvelope,
  onUnlocked,
  onCancel,
  onResetPasswords,
}: {
  open: boolean
  existingEnvelope: string | null
  onUnlocked: (key: VaultKey) => void
  onCancel: () => void
  onResetPasswords: () => Promise<void>
}) {
  const [resetToCreate, setResetToCreate] = useState(false)
  const creating = existingEnvelope == null || resetToCreate
  const envelopeToUnlock = resetToCreate ? null : existingEnvelope
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetError, setResetError] = useState("")

  const reset = () => {
    setPassword("")
    setConfirm("")
    setVisible(false)
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError("")
    if (creating) {
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
      const key = await unlockVault(password, envelopeToUnlock)
      reset()
      setResetToCreate(false)
      onUnlocked(key)
    } catch (err) {
      setError(
        err instanceof VaultDecryptError
          ? "Wrong master password."
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
    setError("")
    setResetError("")
    try {
      await onResetPasswords()
      setConfirmReset(false)
      setResetToCreate(true)
      reset()
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Couldn't reset saved passwords.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) {
          reset()
          setResetToCreate(false)
          onCancel()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LockKeyhole className="size-5 text-primary" aria-hidden="true" />
              {creating ? "Create a master password" : "Unlock passwords"}
            </DialogTitle>
            <DialogDescription>
              {creating
                ? "It encrypts your saved passwords in this browser. It is never saved or sent anywhere, so if you forget it, your saved passwords can't be recovered."
                : "Enter your master password to use your saved passwords. It stays in this tab and locks again after 10 minutes of inactivity."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label htmlFor="vault-master-password" className="text-sm font-semibold">
              Master password
            </label>
            <div className="relative">
              <Input
                id="vault-master-password"
                type={visible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={creating ? "new-password" : "current-password"}
                autoFocus
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

          {creating && (
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
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                reset()
                setResetToCreate(false)
                onCancel()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !password}>
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              {creating ? "Create and unlock" : "Unlock"}
            </Button>
          </DialogFooter>
          {!creating && (
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-sm text-muted-foreground"
                onClick={() => setConfirmReset(true)}
                disabled={busy}
              >
                Forgot master password? Reset saved passwords
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
      <AlertDialog open={confirmReset} onOpenChange={(open) => !busy && setConfirmReset(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the master password?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes every saved encrypted password from H-Vault. Account names,
              usernames, and links stay. You cannot recover the removed passwords. Continue only
              after resetting those accounts on their own websites.
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
              {busy ? "Clearing passwords…" : "Clear saved passwords"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
