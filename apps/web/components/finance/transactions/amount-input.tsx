"use client";

import { useImperativeHandle, useLayoutEffect, useRef, type KeyboardEvent, type Ref } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { groupAmount, sanitizeAmount } from "@/lib/finance/amount-entry";
import type { Currency } from "@/types/finance";

// Where the caret belongs in `formatted` so it sits after the same number of
// significant characters (digits and the decimal point) it followed before.
function caretAfter(formatted: string, significant: number): number {
  if (significant <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (/[\d.]/.test(formatted[index]!)) seen += 1;
    if (seen === significant) return index + 1;
  }
  return formatted.length;
}

/**
 * The transaction sheet's amount entry: a large, grouped ("12,500") text input
 * that stores a plain number string, with a clear button. Thousands separators
 * are re-inserted on every keystroke without moving the caret.
 */
export function AmountInput({
  ref,
  id,
  value,
  currency,
  tone,
  onValueChange,
  onEnter,
}: {
  ref?: Ref<HTMLInputElement>;
  id: string;
  value: string;
  currency: Currency;
  tone: "expense" | "income";
  onValueChange: (value: string) => void;
  onEnter?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  const formatted = groupAmount(value);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (pendingCaret.current === null || !input || document.activeElement !== input) return;
    const position = caretAfter(formatted, pendingCaret.current);
    input.setSelectionRange(position, position);
    pendingCaret.current = null;
  }, [formatted]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && onEnter) {
      event.preventDefault();
      onEnter();
      return;
    }
    // Backspace right after a separator would only delete the "," (which is
    // re-inserted at once); step over it so the digit before it goes instead.
    const input = event.currentTarget;
    const caret = input.selectionStart;
    if (event.key === "Backspace" && caret !== null && caret === input.selectionEnd && formatted[caret - 1] === ",") {
      input.setSelectionRange(caret - 1, caret - 1);
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className={cn(
          "shrink-0 text-2xl font-semibold sm:text-3xl",
          tone === "expense" ? "text-destructive/70" : "text-success/80"
        )}
        aria-hidden="true"
      >
        {currency === "USD" ? "$" : "₩"}
      </span>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode={currency === "USD" ? "decimal" : "numeric"}
        autoComplete="off"
        placeholder="0"
        value={formatted}
        onChange={(event) => {
          const typed = event.target.value;
          const caret = event.target.selectionStart ?? typed.length;
          pendingCaret.current = typed.slice(0, caret).replace(/[^\d.]/g, "").length;
          onValueChange(sanitizeAmount(typed, currency));
        }}
        onKeyDown={handleKeyDown}
        required
        className="w-full min-w-0 bg-transparent font-mono text-[clamp(2rem,10vw,2.75rem)] font-semibold tracking-[-0.035em] tabular-nums outline-none placeholder:text-muted-foreground/40"
      />
      {value !== "" && (
        <button
          type="button"
          onClick={() => {
            onValueChange("");
            inputRef.current?.focus();
          }}
          aria-label="Clear amount"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground sm:size-8"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
