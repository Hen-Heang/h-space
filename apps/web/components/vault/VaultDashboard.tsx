"use client"

import { useMemo, useRef, useState, useSyncExternalStore } from "react"
import { motion } from "motion/react"
import {
  FileUp,
  FlaskConical,
  Lock,
  Plus,
  RefreshCw,
  SearchX,
  Star,
  Vault,
  WifiOff,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getApiErrorMessage, resetVaultDemoData } from "@/lib/api"
import { useVaultAccounts, useVaultMutations } from "@/hooks/useVault"
import { containerVariants, itemVariants } from "@/lib/motion"
import {
  accountToFormValues,
  applyVaultFilters,
  countByCategory,
  defaultVaultFilters,
  firstPasswordEnvelope,
  formValuesToInput,
  getCategoryLabel,
  hasActiveVaultFilters,
  VAULT_CATEGORIES,
  vaultStats,
  type VaultAccount,
  type VaultAccountFormValues,
  type VaultFilters,
} from "@/lib/vault"
import { cn } from "@/lib/utils"
import {
  decryptVaultPassword,
  encryptVaultPassword,
  VaultDecryptError,
  type VaultKey,
} from "@/lib/vault-crypto"
import {
  getVaultKey,
  isVaultUnlocked,
  lockVault,
  setVaultKey,
  subscribeVaultSession,
} from "@/lib/vault-session"
import { categoryStyle } from "./vaultMeta"
import { accountTitle, VaultAccountCard, type VaultAccountActions } from "./VaultAccountCard"
import { VaultAccountDetailsDialog } from "./VaultAccountDetailsDialog"
import { VaultAccountFormDialog } from "./VaultAccountFormDialog"
import { copyPassword, PasswordNotice } from "./VaultAccountParts"
import { VaultDeleteDialog } from "./VaultDeleteDialog"
import { VaultEmptyState } from "./VaultEmptyState"
import { VaultToolbar } from "./VaultToolbar"
import { VaultImportDialog } from "./VaultImportDialog"
import { VaultUnlockDialog } from "./VaultUnlockDialog"

type FormState = { mode: "create" } | { mode: "edit"; account: VaultAccount } | null

function StatTile({
  label,
  value,
  onClick,
  active,
}: {
  label: string
  value: string
  onClick?: () => void
  active?: boolean
}) {
  const content = (
    <>
      <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </span>
      <span className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</span>
    </>
  )
  const className = cn(
    "flex min-h-20 flex-col justify-center rounded-xl border bg-card px-4 py-3 text-left shadow-sm dark:bg-slate-900/40",
    active ? "border-primary/50 ring-1 ring-primary/30" : "border-border",
  )
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        className,
        "outline-none transition-colors hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  )
}

function AccountGrid({
  accounts,
  actions,
}: {
  accounts: VaultAccount[]
  actions: VaultAccountActions
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {accounts.map((account) => (
        <li key={account.id} className="min-w-0">
          <VaultAccountCard account={account} {...actions} />
        </li>
      ))}
    </ul>
  )
}

export function VaultDashboard() {
  const { accounts, loading, error, retry, retrying, isLive } = useVaultAccounts()
  const { create, update, setFavorite, remove, createMany } = useVaultMutations()

  const [filters, setFilters] = useState<VaultFilters>(defaultVaultFilters)
  const [grouped, setGrouped] = useState(false)
  const [formState, setFormState] = useState<FormState>(null)
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<VaultAccount | null>(null)
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const unlockRequest = useRef<{
    resolve: (key: VaultKey) => void
    reject: (reason: Error) => void
  } | null>(null)
  const unlocked = useSyncExternalStore(subscribeVaultSession, isVaultUnlocked, () => false)

  const stats = useMemo(() => vaultStats(accounts), [accounts])
  const categoryCounts = useMemo(() => countByCategory(accounts), [accounts])
  const visible = useMemo(() => applyVaultFilters(accounts, filters), [accounts, filters])
  // Derived from the live list so the details dialog reflects edits/favorites
  // immediately and closes by itself if the account is deleted.
  const detailsAccount = accounts.find((a) => a.id === detailsId) ?? null

  const editingAccount = formState?.mode === "edit" ? formState.account : null
  // Memoized: the form dialog resets whenever this identity changes.
  const formInitialValues = useMemo(
    () => (editingAccount ? accountToFormValues(editingAccount) : undefined),
    [editingAccount],
  )

  const patchFilters = (patch: Partial<VaultFilters>) => setFilters((f) => ({ ...f, ...patch }))
  const clearFilters = () => setFilters((f) => ({ ...defaultVaultFilters, sort: f.sort }))

  /** The unlocked key, asking for the master password first if needed. Rejects on cancel. */
  const requestKey = (): Promise<VaultKey> => {
    const key = getVaultKey()
    if (key) return Promise.resolve(key)
    unlockRequest.current?.reject(new Error("Unlock cancelled."))
    return new Promise<VaultKey>((resolve, reject) => {
      unlockRequest.current = { resolve, reject }
      setUnlockOpen(true)
    })
  }

  const finishUnlock = (key: VaultKey | null) => {
    setUnlockOpen(false)
    const request = unlockRequest.current
    unlockRequest.current = null
    if (key) {
      setVaultKey(key)
      request?.resolve(key)
    } else {
      request?.reject(new Error("Unlock cancelled."))
    }
  }

  /** Decrypts one account's password in the browser; null when cancelled or failed. */
  const decryptFor = async (account: VaultAccount): Promise<string | null> => {
    if (!account.passwordCiphertext) return null
    let key: VaultKey
    try {
      key = await requestKey()
    } catch {
      return null
    }
    try {
      return await decryptVaultPassword(account.passwordCiphertext, key)
    } catch (err) {
      // A different master password was used for this one (e.g. edited on
      // another device before the vault was unlocked here).
      toast.error(
        err instanceof VaultDecryptError
          ? "This password was saved with a different master password."
          : "Couldn't decrypt the password.",
      )
      return null
    }
  }

  const handleCopyPassword = async (account: VaultAccount) => {
    const value = await decryptFor(account)
    if (value != null) await copyPassword(value)
  }

  const handleResetSavedPasswords = async () => {
    for (const account of accounts) {
      if (!account.passwordCiphertext) continue
      await update.mutateAsync({ id: account.id, data: { passwordCiphertext: null } })
    }
    lockVault()
  }

  const handleSubmit = async (values: VaultAccountFormValues) => {
    const base = formValuesToInput(values)
    // Encrypt BEFORE anything leaves the form: only the envelope is ever sent.
    let passwordCiphertext: string | null | undefined
    if (values.password && !values.removePassword) {
      let key: VaultKey
      try {
        key = await requestKey()
      } catch (err) {
        toast.error("Unlock with your master password to save the password.")
        throw err
      }
      passwordCiphertext = await encryptVaultPassword(values.password, key)
    } else if (values.removePassword) {
      passwordCiphertext = null
    }
    const input = passwordCiphertext === undefined ? base : { ...base, passwordCiphertext }
    try {
      if (formState?.mode === "edit") {
        await update.mutateAsync({ id: formState.account.id, data: input })
        toast.success(`Saved ${input.serviceName}`)
      } else {
        await create.mutateAsync(input)
        toast.success(`Added ${input.serviceName}`)
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't save the account. Please try again."))
      throw err
    }
  }

  const handleToggleFavorite = async (account: VaultAccount) => {
    try {
      await setFavorite.mutateAsync({ id: account.id, isFavorite: !account.isFavorite })
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't update favorite."))
    }
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    const title = accountTitle(pendingDelete)
    try {
      await remove.mutateAsync(pendingDelete.id)
      toast.success(`Deleted ${title}`)
      setPendingDelete(null)
      if (detailsId === pendingDelete.id) setDetailsId(null)
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't delete the account."))
    }
  }

  const cardActions = {
    onView: (account: VaultAccount) => setDetailsId(account.id),
    onEdit: (account: VaultAccount) => setFormState({ mode: "edit", account }),
    onDelete: (account: VaultAccount) => setPendingDelete(account),
    onToggleFavorite: handleToggleFavorite,
    onCopyPassword: handleCopyPassword,
  }

  const addButton = (
    <Button onClick={() => setFormState({ mode: "create" })} className="min-h-11">
      <Plus aria-hidden="true" />
      Add account
    </Button>
  )

  const renderResults = () => {
    if (loading) {
      return (
        <div
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          aria-busy="true"
          aria-label="Loading accounts"
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="mt-4 h-11 w-full rounded-xl" />
              <Skeleton className="mt-3 h-4 w-2/3" />
            </div>
          ))}
        </div>
      )
    }

    if (error) {
      return (
        <VaultEmptyState
          tone="error"
          icon={WifiOff}
          title={error}
          description="Check your connection and try again. Nothing was changed."
          actions={
            <Button variant="outline" onClick={() => retry()} disabled={retrying}>
              <RefreshCw className={cn(retrying && "animate-spin")} aria-hidden="true" />
              Try again
            </Button>
          }
        />
      )
    }

    if (accounts.length === 0) {
      return (
        <VaultEmptyState
          icon={Vault}
          title="No accounts yet"
          description="Add the services you use and which email or username belongs to each — no passwords needed."
          actions={
            <>
              {addButton}
              {!isLive && (
                <Button
                  variant="outline"
                  onClick={() => {
                    resetVaultDemoData()
                    retry()
                  }}
                >
                  Restore sample data
                </Button>
              )}
            </>
          }
        />
      )
    }

    if (visible.length === 0) {
      let empty: { icon: LucideIcon; title: string; description: string }
      if (filters.query.trim()) {
        empty = {
          icon: SearchX,
          title: `No accounts match “${filters.query.trim()}”`,
          description: "Try a service name, label, email, or username — or clear the filters.",
        }
      } else if (filters.view === "favorites") {
        empty = {
          icon: Star,
          title: "No favorites yet",
          description: "Tap the star on an account to keep it here for quick access.",
        }
      } else if (filters.category !== "all") {
        empty = {
          icon: categoryStyle(filters.category).icon,
          title: `No accounts in ${getCategoryLabel(filters.category)}`,
          description: "Add one, or look in another category.",
        }
      } else {
        empty = {
          icon: SearchX,
          title: "No accounts match these filters",
          description: "Try a different status or clear the filters.",
        }
      }
      return (
        <VaultEmptyState
          {...empty}
          actions={
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      )
    }

    if (grouped) {
      const known = VAULT_CATEGORIES.map((c) => c.id as string)
      const groupIds = [
        ...known,
        ...Array.from(new Set(visible.map((a) => a.category))).filter((c) => !known.includes(c)),
      ]
      return (
        <div className="space-y-6">
          {groupIds.map((categoryId) => {
            const items = visible.filter((a) => a.category === categoryId)
            if (items.length === 0) return null
            const { icon: Icon } = categoryStyle(categoryId)
            return (
              <section key={categoryId} aria-labelledby={`vault-group-${categoryId}`}>
                <h2
                  id={`vault-group-${categoryId}`}
                  className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-foreground"
                >
                  <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                  {getCategoryLabel(categoryId)}
                  <span className="text-xs font-medium text-muted-foreground">{items.length}</span>
                </h2>
                <AccountGrid accounts={items} actions={cardActions} />
              </section>
            )
          })}
        </div>
      )
    }

    return <AccountGrid accounts={visible} actions={cardActions} />
  }

  const statValue = (n: number) => (loading ? "…" : String(n))
  const filtersActive = hasActiveVaultFilters(filters)

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-5 pb-12 sm:space-y-6"
    >
      <motion.header
        variants={itemVariants}
        className="relative overflow-hidden rounded-lg border border-border/70 bg-card/90 p-5 shadow-sm shadow-slate-950/5 sm:p-6 dark:bg-slate-900/70"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/25 to-transparent"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
              aria-hidden="true"
            >
              <Vault className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                Find which email or username you use for every service, organized by category.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 min-[420px]:flex-row min-[420px]:flex-wrap sm:w-auto lg:justify-end">
            {addButton}
            <Button variant="outline" onClick={() => setImportOpen(true)} className="min-h-11">
              <FileUp aria-hidden="true" />
              Import CSV
            </Button>
            {unlocked && (
              <Button
                variant="outline"
                onClick={() => {
                  lockVault()
                  toast.success("Passwords locked")
                }}
                className="min-h-11"
              >
                <Lock aria-hidden="true" />
                Lock passwords
              </Button>
            )}
          </div>
        </div>
      </motion.header>

      <motion.div variants={itemVariants} className="space-y-3">
        <PasswordNotice />
        {!isLive && (
          <p
            role="note"
            className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm leading-6 text-foreground"
          >
            <FlaskConical
              className="mt-0.5 size-4.5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <span>
              <strong className="font-semibold">Demo mode.</strong> Showing fictional sample
              accounts saved only in this browser. Syncing to your H-Space account starts once the
              H-Vault database migration is approved and applied.
            </span>
          </p>
        )}
      </motion.div>

      <motion.section
        variants={itemVariants}
        aria-label="Overview"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatTile
          label="Total accounts"
          value={statValue(stats.total)}
          active={!filtersActive}
          onClick={clearFilters}
        />
        <StatTile
          label="Favorites"
          value={statValue(stats.favorites)}
          active={filters.view === "favorites"}
          onClick={() => patchFilters({ view: filters.view === "favorites" ? "all" : "favorites" })}
        />
        <StatTile label="Categories" value={statValue(stats.categories)} />
        <StatTile
          label="Needs review"
          value={statValue(stats.needsReview)}
          active={filters.status === "needs_review"}
          onClick={() =>
            patchFilters({ status: filters.status === "needs_review" ? "all" : "needs_review" })
          }
        />
      </motion.section>

      <motion.div variants={itemVariants}>
        <VaultToolbar
          filters={filters}
          onChange={patchFilters}
          categoryCounts={categoryCounts}
          grouped={grouped}
          onGroupedChange={setGrouped}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-3">
        {!loading && !error && accounts.length > 0 && (
          <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {visible.length === accounts.length
                ? `${accounts.length} ${accounts.length === 1 ? "account" : "accounts"}`
                : `${visible.length} of ${accounts.length} accounts`}
            </p>
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        )}
        {renderResults()}
      </motion.div>

      <VaultAccountFormDialog
        open={formState != null}
        onOpenChange={(open) => !open && setFormState(null)}
        mode={formState?.mode ?? "create"}
        initialValues={formInitialValues}
        hasSavedPassword={Boolean(editingAccount?.passwordCiphertext)}
        onSubmit={handleSubmit}
      />

      <VaultAccountDetailsDialog
        account={formState || pendingDelete ? null : detailsAccount}
        onOpenChange={(open) => !open && setDetailsId(null)}
        onEdit={cardActions.onEdit}
        onDelete={cardActions.onDelete}
        onToggleFavorite={handleToggleFavorite}
        onCopyPassword={handleCopyPassword}
        onRevealPassword={decryptFor}
      />

      <VaultImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        existingAccounts={accounts}
        requestKey={requestKey}
        importItems={(items, onProgress) => createMany.mutateAsync({ items, onProgress })}
      />

      <VaultUnlockDialog
        open={unlockOpen}
        existingEnvelope={firstPasswordEnvelope(accounts)}
        onUnlocked={(key) => finishUnlock(key)}
        onCancel={() => finishUnlock(null)}
        onResetPasswords={handleResetSavedPasswords}
      />

      <VaultDeleteDialog
        account={pendingDelete}
        deleting={remove.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </motion.div>
  )
}
