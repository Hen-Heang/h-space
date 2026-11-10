"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"

import { TransactionSheet } from "@/components/finance/transactions/transaction-sheet"
import { createTransaction } from "@/lib/api/finance"
import { emitTransactionChanged } from "@/lib/finance-events"
import {
  placeTransactionInLists,
  useCategories,
  usePaymentMethods,
  useTemplateActions,
  useTemplates,
} from "@/lib/query/finance-queries"
import type { CreateTransactionInput } from "@/lib/validation/finance"

/**
 * Ported from Luyra: the daily-use shortcut for logging a transaction from
 * any Finance page, not just Transactions. In Luyra it was global because the
 * whole app was Finance; in H-Space it is mounted by app/(main)/finance/layout.
 *
 * Placement:
 * - Phones (AppShell's "mobile" mode, < 768px = Tailwind `md`): a round button
 *   in the bottom-right corner, 0.75rem above the bottom nav. The shell has no
 *   floating AI launcher (Ask Hengo is in the top bar), so nothing is stacked
 *   under it. --shell-bottom-nav-h (set by AppShell, 0 when the nav is hidden)
 *   keeps it above the tab bar; the max() keeps it off the home indicator when
 *   the nav is hidden.
 * - Tablet and desktop: the corner, with its label — the one obvious
 *   "Add transaction" on every Finance page.
 * The finance layout adds bottom padding so the last row can scroll clear.
 */
export function QuickAddTransaction() {
  const [open, setOpen] = useState(false)
  // Fetched on first open, then served from the shared cache. If a lookup
  // fails the sheet still works with an empty picker; reopening retries.
  const { data: categories = [] } = useCategories({ enabled: open })
  const { data: paymentMethods = [] } = usePaymentMethods({ enabled: open })
  const { data: templates = [] } = useTemplates({ enabled: open })
  const { saveTemplate, removeTemplate } = useTemplateActions()
  const queryClient = useQueryClient()

  async function handleSave(input: CreateTransactionInput) {
    placeTransactionInLists(queryClient, await createTransaction(input))
    emitTransactionChanged()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add transaction"
        className="fixed right-4 bottom-[calc(var(--shell-bottom-nav-h,0px)+max(0.75rem,calc(env(safe-area-inset-bottom)-var(--shell-bottom-nav-h,0px))))] z-40 flex size-12 items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none md:right-6 md:bottom-6 md:w-auto md:pr-5 md:pl-4"
      >
        <Plus className="size-5.5" strokeWidth={2.4} aria-hidden />
        <span className="hidden text-sm font-semibold md:inline" aria-hidden>
          Add transaction
        </span>
      </button>

      <TransactionSheet
        mode="create"
        categories={categories}
        paymentMethods={paymentMethods}
        templates={templates}
        open={open}
        onOpenChange={setOpen}
        onSave={handleSave}
        onSaveTemplate={saveTemplate}
        onDeleteTemplate={removeTemplate}
      />
    </>
  )
}
