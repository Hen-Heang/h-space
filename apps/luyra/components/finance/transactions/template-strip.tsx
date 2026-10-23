"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { krw } from "@/lib/finance-format";
import type { TransactionTemplate } from "@/types/finance";

export function TemplateStrip({
  templates,
  onApply,
  onDelete,
}: {
  templates: TransactionTemplate[];
  onApply: (template: TransactionTemplate) => void;
  onDelete: (template: TransactionTemplate) => void;
}) {
  if (templates.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Templates</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {templates.map((template) => (
          <div key={template.id} className="relative shrink-0">
            <button
              type="button"
              onClick={() => onApply(template)}
              className={cn(
                "flex min-h-11 items-center gap-1.5 rounded-full border pl-3 pr-11 text-xs font-semibold transition-colors active:scale-[0.98] sm:min-h-9 sm:pr-9",
                template.type === "expense"
                  ? "border-destructive/25 bg-destructive/10 text-destructive"
                  : "border-success/25 bg-success/10 text-success"
              )}
            >
              <span aria-hidden="true">{template.categoryIcon ?? (template.type === "expense" ? "💸" : "💰")}</span>
              <span className="max-w-24 truncate">{template.description}</span>
              <span className="opacity-70">{krw.format(template.amountKrw)}</span>
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(template);
              }}
              aria-label={`Delete template ${template.description}`}
              className="absolute right-0 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-current opacity-70 hover:bg-background/60 hover:opacity-100"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
