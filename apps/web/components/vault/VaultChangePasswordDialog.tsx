"use client"

import { useState } from "react"
import { KeyRound, Loader2 } from "lucide-react"

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
import type { VaultKeysetRecord } from "@/lib/api"
import {
  changeMasterPassword,
  MIN_MASTER_PASSWORD_LENGTH,
  type VaultKey,
  type VaultKeysetData,
} from "@/lib/vault-crypto"

/**
 * Re-wraps the vault key under a new master password (lib/vault-crypto.ts).
 * Only the keyset changes, so it's instant however many accounts there are;
 * the recovery key keeps working.
 */
export function VaultChangePasswordDialog({
  open,
  userId,
  keyset,
  saveKeyset,
  onChanged,
  onOpenChange,
}: {
  open: boolean
  userId: string
  keyset: VaultKeysetRecord | null
  saveKeyset: (data: VaultKeysetData, version: number | null) => Promise<VaultKeysetRecord>
  onChanged: (key: VaultKey) => void
  onOpenChange: (open: boolean) => void
}) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const close = () => {
    if (busy) return
    setCurrent("")
    setNext("")
    setConfirm("")
    setError("")
    onOpenChange(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy || !keyset) return
    setError("")
    if (next.length < MIN_MASTER_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_MASTER_PASSWORD_LENGTH} characters.`)
      return
    }
    if (next !== confirm) {
      setError("The two new passwords don't match.")
      return
    }
    setBusy(true)
    try {
      const result = await changeMasterPassword(keyset, current, next, userId)
      await saveKeyset(result.keyset, keyset.version)
      onChanged(result.vaultKey)
      setBusy(false)
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change the master password.")
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && close()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" aria-hidden="true" />
              Change master password
            </DialogTitle>
            <DialogDescription>
              Your accounts stay as they are. Your recovery key keeps working.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="vault-current-password" className="text-sm font-semibold">
              Current master password
            </label>
            <Input
              id="vault-current-password"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="vault-new-password" className="text-sm font-semibold">
              New master password
            </label>
            <Input
              id="vault-new-password"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="vault-new-confirm" className="text-sm font-semibold">
              Confirm new master password
            </label>
            <Input
              id="vault-new-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !current || !next}>
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              Change password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
