"use client"

import { useState } from "react"
import { Loader2, ShieldCheck } from "lucide-react"

import { MfaDevicePicker, useMfaDevices } from "@/components/auth/mfa-device-picker"
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
import { MFA_CODE_INVALID, mfaApi } from "@/lib/api"

/**
 * Step-up for H-Vault's destructive actions (reset, master-password change,
 * recovery). The routes refuse those unless this session checked an
 * authenticator code in the last few minutes; this asks for one, verifies it
 * with Supabase on the current session, and reports back so the request can be
 * sent again (lib/api/vault-http.ts). The code itself never reaches H-Space's
 * routes.
 */
export function VaultStepUpDialog({
  open,
  onDone,
}: {
  open: boolean
  /** true once the code is verified; false when the user cancels. */
  onDone: (verified: boolean) => void
}) {
  const devices = useMfaDevices(open)
  const [picked, setPicked] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const factorId = picked ?? devices[0]?.factorId ?? null

  const finish = (verified: boolean) => {
    if (busy) return
    setCode("")
    setError("")
    setPicked(null)
    onDone(verified)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!factorId) {
      setError("Couldn't load your authenticators. Close this and try again.")
      return
    }
    setBusy(true)
    setError("")
    try {
      await mfaApi.reverify(factorId, code)
      setBusy(false)
      setCode("")
      setPicked(null)
      onDone(true)
    } catch (err) {
      const invalid = (err as { code?: unknown } | null)?.code === MFA_CODE_INVALID
      setError(invalid ? "That code didn't work. Try the current one." : "Couldn't check the code.")
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && finish(false)}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
              Confirm it&apos;s you
            </DialogTitle>
            <DialogDescription>
              This change affects your whole vault. Enter a code from your authenticator app.
            </DialogDescription>
          </DialogHeader>
          <MfaDevicePicker
            devices={devices}
            value={factorId}
            onChange={(id) => {
              setPicked(id)
              setError("")
            }}
          />
          <div className="space-y-2">
            <label htmlFor="vault-step-up-code" className="text-sm font-semibold">
              Verification code
            </label>
            <Input
              id="vault-step-up-code"
              name="one-time-code"
              autoComplete="one-time-code"
              inputMode="numeric"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              className="text-center text-lg tracking-[0.4em]"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => finish(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || code.trim().length === 0}>
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              Confirm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
