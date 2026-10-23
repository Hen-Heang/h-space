"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { IconPicker } from "@/components/finance/settings/lookup-primitives";
import { ApiError } from "@/lib/api/client";
import type { PaymentMethod } from "@/types/finance";

export const PAYMENT_METHOD_ICONS = ["💳", "💵", "🏦", "📱", "🎫", "🪙", "💼", "🧾"] as const;

export interface PaymentMethodFormValues {
  name: string;
  icon: string;
}

export function PaymentMethodSheet({
  mode,
  paymentMethod,
  open,
  onOpenChange,
  onSave,
}: {
  mode: "create" | "edit";
  paymentMethod?: PaymentMethod;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: PaymentMethodFormValues) => Promise<void>;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" size="form">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "New payment method" : "Edit payment method"}</SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? "How you paid — a card, cash, or an account. Used to break spending down by method."
              : "Renaming updates it everywhere it is already used."}
          </SheetDescription>
        </SheetHeader>
        {open && (
          <PaymentMethodSheetFields
            key={`${mode}-${paymentMethod?.id ?? "create"}`}
            mode={mode}
            paymentMethod={paymentMethod}
            onSave={onSave}
            onOpenChange={onOpenChange}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function PaymentMethodSheetFields({
  mode,
  paymentMethod,
  onSave,
  onOpenChange,
}: {
  mode: "create" | "edit";
  paymentMethod?: PaymentMethod;
  onSave: (values: PaymentMethodFormValues) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(paymentMethod?.name ?? "");
  const [icon, setIcon] = useState(paymentMethod?.icon ?? PAYMENT_METHOD_ICONS[0]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length === 0) {
      setError("Name is required.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), icon });
      onOpenChange(false);
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : "Couldn't save the payment method. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        <div className="space-y-1.5">
          <Label htmlFor="payment-method-name">Name</Label>
          <Input
            id="payment-method-name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Shinhan card, Cash…"
            maxLength={40}
            required
          />
        </div>

        <IconPicker
          id="payment-method-icon-label"
          label="Icon"
          icons={PAYMENT_METHOD_ICONS}
          value={icon}
          onChange={setIcon}
        />

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>

      <SheetFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending} className="min-h-11 flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={pending} className="min-h-11 flex-1">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {mode === "create" ? "Add payment method" : "Save changes"}
        </Button>
      </SheetFooter>
    </form>
  );
}
