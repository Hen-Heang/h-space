"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { TransactionSheet } from "@/components/finance/transactions/transaction-sheet";
import { createTransaction } from "@/lib/api/finance";
import { emitTransactionChanged } from "@/lib/finance-events";
import {
  placeTransactionInLists,
  useCategories,
  usePaymentMethods,
  useTemplateActions,
  useTemplates,
} from "@/lib/query/finance-queries";
import type { CreateTransactionInput } from "@/lib/validation/finance";

/**
 * A globally-mounted "compose" button — the daily-use shortcut for logging a
 * transaction from anywhere in the app, not just the Transactions page.
 * Sits above the mobile tab bar (Telegram-style floating compose action);
 * on tablet/desktop it floats at the window's bottom-right instead.
 */
export function QuickAddTransaction() {
  const [open, setOpen] = useState(false);
  // Fetched on first open, then served from the shared cache. If a lookup
  // fails the sheet still works with an empty picker; reopening retries.
  const { data: categories = [] } = useCategories({ enabled: open });
  const { data: paymentMethods = [] } = usePaymentMethods({ enabled: open });
  const { data: templates = [] } = useTemplates({ enabled: open });
  const { saveTemplate, removeTemplate } = useTemplateActions();
  const queryClient = useQueryClient();

  async function handleSave(input: CreateTransactionInput) {
    placeTransactionInLists(queryClient, await createTransaction(input));
    emitTransactionChanged();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add transaction"
        className="fixed right-4 bottom-[calc(var(--mobile-nav-inset)+1rem)] z-40 flex size-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/15 outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none md:bottom-6 md:size-14"
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
  );
}
