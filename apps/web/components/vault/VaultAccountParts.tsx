"use client"

import { ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { getStatusLabel, VAULT_PASSWORD_NOTICE, type VaultStatus } from "@/lib/vault"
import { cn } from "@/lib/utils"
import { brandTone, resolveServiceBrand } from "@/lib/vault-brands"
import { categoryStyle, STATUS_TONES } from "./vaultMeta"

/**
 * The service's platform logo (bundled, see lib/vault-brands.ts), or an
 * initial-letter avatar — in the brand's color when known, otherwise tinted
 * by category. Deliberately no remote favicon: fetching icons from a
 * third-party service would leak the list of services you hold accounts with.
 */
export function ServiceAvatar({
  serviceName,
  category,
  websiteUrl,
  size = "md",
}: {
  serviceName: string
  category: string
  websiteUrl?: string | null
  size?: "md" | "lg"
}) {
  const brand = resolveServiceBrand(serviceName, websiteUrl)
  const initial = serviceName.trim().charAt(0).toUpperCase() || "?"
  const box = cn(
    "flex shrink-0 items-center justify-center rounded-xl font-semibold",
    size === "lg" ? "size-12 text-lg" : "size-10 text-base",
  )

  if (!brand) {
    return (
      <span aria-hidden="true" className={cn(box, categoryStyle(category).tone)}>
        {initial}
      </span>
    )
  }

  if (brand.kind === "color") {
    const label = brand.label ?? initial
    return (
      <span
        aria-hidden="true"
        data-brand={brand.title}
        // A faint ring keeps very dark badges (OpenAI black) visible in dark mode.
        className={cn(
          box,
          "ring-1 ring-border/60",
          label.length >= 3 ? "text-[0.7rem] tracking-tight" : label.length === 2 && "text-sm",
        )}
        style={{
          backgroundColor: brand.hex,
          color: brandTone(brand.hex) === "solid" ? "#191919" : "#FFFFFF",
        }}
      >
        {label}
      </span>
    )
  }

  if (brand.kind === "art") {
    const svg = (
      <svg viewBox="0 0 24 24" className="size-full" focusable="false">
        {brand.shapes.map((shape, i) => (
          <path key={i} d={shape.d} fill={shape.fill} />
        ))}
      </svg>
    )
    return (
      <span
        aria-hidden="true"
        data-brand={brand.title}
        className={cn(box, brand.layout === "full" ? "overflow-hidden" : "bg-muted p-2.5")}
      >
        {svg}
      </span>
    )
  }

  const tone = brandTone(brand.hex)
  return (
    <span
      aria-hidden="true"
      data-brand={brand.title}
      className={cn(box, tone === "ink" && "bg-muted text-foreground")}
      style={
        tone === "solid"
          ? { backgroundColor: brand.hex, color: "#191919" }
          : tone === "tint"
            ? { backgroundColor: `${brand.hex}1F`, color: brand.hex }
            : undefined
      }
    >
      <svg
        viewBox="0 0 24 24"
        className={size === "lg" ? "size-6" : "size-5"}
        fill="currentColor"
        focusable="false"
      >
        <path d={brand.path} />
      </svg>
    </span>
  )
}

export function StatusBadge({ status }: { status: VaultStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        STATUS_TONES[status],
      )}
    >
      {getStatusLabel(status)}
    </span>
  )
}

export function CategoryChip({ category, label }: { category: string; label: string }) {
  const { icon: Icon } = categoryStyle(category)
  return (
    <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  )
}

export async function copyLoginIdentifier(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
    toast.success("Copied to clipboard")
  } catch {
    toast.error("Couldn't copy — select the text and copy it manually.")
  }
}

/** How long a copied password stays on the clipboard. */
export const PASSWORD_CLIPBOARD_CLEAR_MS = 30_000

let clearTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Copies a decrypted password and wipes the clipboard after 30 seconds. The
 * wipe is unconditional (reading the clipboard back would need another
 * permission prompt), and the toast says so.
 */
export async function copyPassword(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
    toast.success("Password copied — the clipboard clears in 30 seconds")
    if (clearTimer) clearTimeout(clearTimer)
    clearTimer = setTimeout(() => {
      void navigator.clipboard.writeText("").catch(() => {})
      clearTimer = null
    }, PASSWORD_CLIPBOARD_CLEAR_MS)
  } catch {
    toast.error("Couldn't copy the password.")
  }
}

export function PasswordNotice({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/7 px-4 py-3 text-sm leading-6 text-foreground",
        className,
      )}
    >
      <ShieldCheck
        className="mt-0.5 size-4.5 shrink-0 text-emerald-600 dark:text-emerald-400"
        aria-hidden="true"
      />
      <span>{VAULT_PASSWORD_NOTICE}</span>
    </p>
  )
}
