"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LockKeyhole, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRecoveryPrivacy } from "@/hooks/useRecovery"
import {
  hasRecoveryLockCredential,
  isRecoveryUnlocked,
  lockRecovery,
  unlockRecovery,
} from "@/lib/recovery-lock"

export function RecoveryLockGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { settings, loading, error } = useRecoveryPrivacy()
  const [unlocked, setUnlocked] = useState(isRecoveryUnlocked)
  const [pin, setPin] = useState("")
  const [pinError, setPinError] = useState("")
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!settings?.lockEnabled) return
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") lockRecovery()
      if (document.visibilityState === "visible") setUnlocked(isRecoveryUnlocked())
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [settings?.lockEnabled])

  if (loading) return <div className="min-h-[60dvh]" aria-label="Checking Recovery privacy" />
  if (error || !settings || !settings.lockEnabled || unlocked) return children
  const hasCredential = hasRecoveryLockCredential()
  if (!hasCredential && pathname === "/growth/recovery/settings") return children

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setChecking(true)
    setPinError("")
    try {
      if (await unlockRecovery(pin)) {
        setUnlocked(true)
        setPin("")
      } else setPinError("That PIN did not match.")
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[65] flex min-h-[100dvh] items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-xl">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          {hasCredential ? <LockKeyhole size={24} /> : <ShieldCheck size={24} />}
        </span>
        <h2 className="mt-5 text-xl font-semibold">Recovery is locked</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {hasCredential
            ? "Enter the local PIN for this device. The workspace locks again when the app moves to the background."
            : "Set up a local PIN on this device before opening private records."}
        </p>
        {hasCredential ? (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <Input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              pattern="[0-9]*"
              minLength={4}
              maxLength={8}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
              aria-label="Recovery PIN"
              className="h-12 text-center font-mono text-lg tracking-[0.3em]"
              autoFocus
            />
            {pinError && (
              <p role="alert" className="text-sm text-destructive">
                {pinError}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={checking || pin.length < 4}
            >
              {checking ? "Checking…" : "Unlock"}
            </Button>
          </form>
        ) : (
          <Button asChild size="lg" className="mt-6 w-full">
            <Link href="/growth/recovery/settings">Set up this device</Link>
          </Button>
        )}
        <Button asChild variant="ghost" className="mt-2 w-full">
          <Link href="/home">Leave Recovery</Link>
        </Button>
      </div>
    </div>
  )
}
