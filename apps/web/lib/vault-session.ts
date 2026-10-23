import type { VaultKey } from "@/lib/vault-crypto"

// In-memory unlock state for H-Vault. The derived key lives only in this
// module's memory for the current tab: never in localStorage, cookies, the
// query cache, or on the server. It is dropped on lock, on reload, and after
// AUTO_LOCK_MS without vault activity.

export const AUTO_LOCK_MS = 10 * 60 * 1000

let current: VaultKey | null = null
let timer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function armTimer() {
  if (timer) clearTimeout(timer)
  timer = current ? setTimeout(lockVault, AUTO_LOCK_MS) : null
}

export function setVaultKey(key: VaultKey): void {
  current = key
  armTimer()
  emit()
}

/** The unlocked key, or null. Each read counts as activity for auto-lock. */
export function getVaultKey(): VaultKey | null {
  if (current) armTimer()
  return current
}

export function isVaultUnlocked(): boolean {
  return current != null
}

export function lockVault(): void {
  current = null
  armTimer()
  emit()
}

export function subscribeVaultSession(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
