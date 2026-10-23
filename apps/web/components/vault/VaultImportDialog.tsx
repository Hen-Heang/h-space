"use client"

import { useRef, useState } from "react"
import { AlertTriangle, CheckCircle2, FileUp, KeyRound, Loader2, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DEFAULT_VAULT_LOGIN_METHOD,
  getCategoryLabel,
  type VaultAccount,
  type VaultAccountInput,
} from "@/lib/vault"
import { encryptVaultPassword, type VaultKey } from "@/lib/vault-crypto"
import {
  buildImportRows,
  MAX_IMPORT_FILE_BYTES,
  VaultImportError,
  type VaultImportResult,
} from "@/lib/vault-import"
import { cn } from "@/lib/utils"
import { StatusBadge } from "./VaultAccountParts"

type ImportOutcome = { created: number; failed: Array<{ index: number; message: string }> }

type Step =
  | { kind: "pick"; error: string }
  | { kind: "review"; result: VaultImportResult }
  | { kind: "importing"; done: number; total: number }
  | { kind: "done"; outcome: ImportOutcome; failedLines: number[] }

/** Tag added to every imported account so the batch is easy to find and review. */
export const IMPORT_TAG = "imported"

/**
 * CSV import (e.g. a Notion export), entirely in the browser: the file is
 * read locally, every row is reviewed before anything is saved, and passwords
 * are encrypted with the master password before they leave this component.
 * Plain passwords live only in this component's state and are dropped as soon
 * as they're encrypted, or when the dialog closes.
 */
export function VaultImportDialog({
  open,
  onOpenChange,
  existingAccounts,
  requestKey,
  importItems,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingAccounts: VaultAccount[]
  requestKey: () => Promise<VaultKey>
  importItems: (
    items: VaultAccountInput[],
    onProgress: (done: number) => void,
  ) => Promise<ImportOutcome>
}) {
  const [step, setStep] = useState<Step>({ kind: "pick", error: "" })
  const fileInput = useRef<HTMLInputElement>(null)

  const busy = step.kind === "importing"

  const close = () => {
    if (busy) return
    setStep({ kind: "pick", error: "" })
    onOpenChange(false)
  }

  const handleFile = async (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = ""
    if (!file) return
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      setStep({ kind: "pick", error: "That file is too large (1 MB max)." })
      return
    }
    try {
      const result = buildImportRows(await file.text(), existingAccounts)
      setStep({ kind: "review", result })
    } catch (err) {
      setStep({
        kind: "pick",
        error:
          err instanceof VaultImportError ? err.message : "Couldn't read that file. Is it a CSV?",
      })
    }
  }

  const setInclude = (line: number | "all" | "none") => {
    if (step.kind !== "review") return
    const rows = step.result.rows.map((row) => ({
      ...row,
      include:
        line === "all"
          ? true
          : line === "none"
            ? false
            : row.line === line
              ? !row.include
              : row.include,
    }))
    setStep({ kind: "review", result: { ...step.result, rows } })
  }

  const handleImport = async () => {
    if (step.kind !== "review") return
    const selected = step.result.rows.filter((r) => r.include)
    if (selected.length === 0) return

    let key: VaultKey | null = null
    if (selected.some((r) => r.password)) {
      try {
        key = await requestKey()
      } catch {
        return // Unlock cancelled — stay on the review step.
      }
    }

    // Encrypt everything first, then drop the plaintext from state.
    const items: VaultAccountInput[] = []
    for (const row of selected) {
      items.push({
        serviceName: row.serviceName,
        accountLabel: row.accountLabel,
        loginIdentifier: row.loginIdentifier,
        websiteUrl: row.websiteUrl,
        category: row.category,
        tags: [IMPORT_TAG],
        isFavorite: false,
        status: row.status,
        loginMethod: DEFAULT_VAULT_LOGIN_METHOD,
        ...(row.password && key
          ? { passwordCiphertext: await encryptVaultPassword(row.password, key) }
          : {}),
      })
    }
    setStep({ kind: "importing", done: 0, total: items.length })

    const outcome = await importItems(items, (done) =>
      setStep({ kind: "importing", done, total: items.length }),
    )
    setStep({
      kind: "done",
      outcome,
      failedLines: outcome.failed.map((f) => selected[f.index].line),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-2xl" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="size-5 text-primary" aria-hidden="true" />
            Import accounts from CSV
          </DialogTitle>
          <DialogDescription className="flex items-start gap-2">
            <ShieldCheck
              className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            <span>
              The file is read only in this browser. Passwords are encrypted with your master
              password before anything is saved. A Notes column is never imported.
            </span>
          </DialogDescription>
        </DialogHeader>

        {step.kind === "pick" && (
          <div className="space-y-4">
            <ol className="list-decimal space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
              <li>
                In Notion, open the database → <strong>•••</strong> → <strong>Export</strong> →{" "}
                <strong>Markdown &amp; CSV</strong>, then unzip the download.
              </li>
              <li>
                Choose the <code>.csv</code> file below. Columns like Service, Username, Category,
                Status, Website and Password are detected automatically.
              </li>
              <li>Review every row, then import.</li>
            </ol>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              id="vault-import-file"
              aria-label="Choose a CSV file"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Button
              onClick={() => fileInput.current?.click()}
              className="min-h-11 w-full sm:w-auto"
            >
              <FileUp aria-hidden="true" />
              Choose CSV file
            </Button>
            {step.error && (
              <p role="alert" className="text-sm font-semibold text-destructive">
                {step.error}
              </p>
            )}
          </div>
        )}

        {step.kind === "review" && <ReviewStep result={step.result} onToggle={setInclude} />}

        {step.kind === "importing" && (
          <div className="flex items-center gap-3 py-6" role="status" aria-live="polite">
            <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
            <span className="text-sm">
              Importing {step.done} of {step.total}…
            </span>
          </div>
        )}

        {step.kind === "done" && (
          <div className="space-y-3" role="status">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" />
              Imported {step.outcome.created} {step.outcome.created === 1 ? "account" : "accounts"},
              tagged #{IMPORT_TAG}.
            </p>
            {step.failedLines.length > 0 && (
              <p className="flex items-start gap-2 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {step.failedLines.length} failed (rows {step.failedLines.join(", ")}): {""}
                {step.outcome.failed[0]?.message}
              </p>
            )}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 px-3 py-2.5 text-sm leading-6">
              <strong className="font-semibold">Next:</strong> delete the CSV file from your
              computer (it contains plain passwords), and once you&apos;ve checked everything here,
              remove the Password column from Notion.
            </div>
          </div>
        )}

        <DialogFooter>
          {step.kind === "review" && (
            <>
              <Button variant="outline" onClick={() => setStep({ kind: "pick", error: "" })}>
                Choose another file
              </Button>
              <Button onClick={handleImport} disabled={!step.result.rows.some((r) => r.include)}>
                Import {step.result.rows.filter((r) => r.include).length} accounts
              </Button>
            </>
          )}
          {(step.kind === "pick" || step.kind === "done") && (
            <Button variant={step.kind === "done" ? "default" : "outline"} onClick={close}>
              {step.kind === "done" ? "Done" : "Cancel"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReviewStep({
  result,
  onToggle,
}: {
  result: VaultImportResult
  onToggle: (line: number | "all" | "none") => void
}) {
  const selected = result.rows.filter((r) => r.include).length
  const withPasswords = result.rows.filter((r) => r.include && r.password).length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted-foreground" aria-live="polite">
          {result.rows.length} rows ·{" "}
          <strong className="text-foreground">{selected} selected</strong> · {withPasswords} with
          passwords
          {result.skipped > 0 && ` · ${result.skipped} skipped (no service name)`}
        </p>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onToggle("all")}>
            Select all
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onToggle("none")}>
            Select none
          </Button>
        </div>
      </div>

      {result.ignoredColumns.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Not imported: {result.ignoredColumns.join(", ")}
        </p>
      )}

      <ul
        aria-label="Rows to import"
        className="max-h-[50dvh] divide-y divide-border overflow-y-auto overscroll-contain rounded-xl border border-border"
      >
        {result.rows.map((row) => (
          <li key={row.line}>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40",
                !row.include && "opacity-60",
              )}
            >
              <input
                type="checkbox"
                checked={row.include}
                onChange={() => onToggle(row.line)}
                className="mt-1 size-4 shrink-0 accent-primary"
                aria-label={`Import ${row.serviceName}${row.loginIdentifier ? ` (${row.loginIdentifier})` : ""}`}
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-foreground">{row.serviceName}</span>
                  {row.accountLabel && (
                    <span className="text-xs text-muted-foreground">{row.accountLabel}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {getCategoryLabel(row.category)}
                  </span>
                  <StatusBadge status={row.status} />
                  {row.password && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <KeyRound className="size-3" aria-hidden="true" />
                      Password
                    </span>
                  )}
                </span>
                <span className="block truncate font-mono text-xs text-muted-foreground">
                  {row.loginIdentifier ?? "No username"}
                </span>
                {row.warnings.map((w) => (
                  <span key={w} className="block text-xs text-amber-700 dark:text-amber-300">
                    {w}
                  </span>
                ))}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
