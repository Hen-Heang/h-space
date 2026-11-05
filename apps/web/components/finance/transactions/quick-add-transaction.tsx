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
 * Placement: stacked directly above H-Space's floating AI Assistant button
 * (components/chat/FloatingAiCoach — right-4, size-14, ~0.75rem above the
 * bottom nav or the screen edge). size-12 at right-5 shares its centre line;
 * --shell-bottom-nav-h (set by AppShell, 0 when the nav is hidden) keeps the
 * stack above the mobile tab bar.
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
        className="fixed right-5 bottom-[calc(var(--shell-bottom-nav-h,0px)+5rem)] z-40 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/15 outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
      >
        <Plus className="size-5.5" strokeWidth={2.4} aria-hidden />
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
