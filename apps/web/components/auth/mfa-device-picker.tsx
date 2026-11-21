"use client"

import { useEffect, useState } from "react"
import { Smartphone } from "lucide-react"

import { mfaApi, type MfaDevice } from "@/lib/api"
import { cn } from "@/lib/utils"

/**
 * Loads the user's linked authenticators for a two-step code prompt. With one
 * device there's nothing to choose; with several, each has its own codes, so
 * the user picks the one they have to hand (e.g. the backup when the phone is
 * lost).
 */
export function useMfaDevices(active: boolean): MfaDevice[] {
  const [devices, setDevices] = useState<MfaDevice[]>([])
  useEffect(() => {
    if (!active) return
    let cancelled = false
    mfaApi
      .devices()
      .then((list) => {
        if (!cancelled) setDevices(list)
      })
      .catch(() => {
        // The prompt still works with the default device; nothing to show.
      })
    return () => {
      cancelled = true
    }
  }, [active])
  return active ? devices : []
}

/** Radio group of authenticators; renders nothing for fewer than two. */
export function MfaDevicePicker({
  devices,
  value,
  onChange,
  label = "Code from",
}: {
  devices: MfaDevice[]
  value: string | null
  onChange: (factorId: string) => void
  label?: string
}) {
  if (devices.length < 2) return null
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      <div className="grid gap-2">
        {devices.map((device) => {
          const selected = device.factorId === value
          return (
            <label
              key={device.factorId}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring",
                selected
                  ? "border-primary bg-primary/5 font-semibold text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <input
                type="radio"
                name="mfa-device"
                value={device.factorId}
                checked={selected}
                onChange={() => onChange(device.factorId)}
                className="sr-only"
              />
              <Smartphone size={16} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 truncate">{device.name}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
