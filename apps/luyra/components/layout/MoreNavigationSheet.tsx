"use client";

import { ChevronRight } from "lucide-react";

import { NavRow } from "@/components/layout/NavItem";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { isNavigationItemActive, moreItems } from "@/lib/navigation";

/** Mobile "More" sheet — every top-level destination not already a bottom tab. */
export function MoreNavigationSheet({
  open,
  onOpenChange,
  pathname,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
}) {
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85dvh] gap-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader className="pb-2 pr-16">
          <SheetTitle>More</SheetTitle>
          <SheetDescription className="sr-only">Everything not in the bottom navigation bar.</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <nav aria-label="More" className="space-y-1">
            {moreItems.map((item) => (
              <NavRow
                key={item.id}
                item={item}
                variant="list"
                active={isNavigationItemActive({ pathname, item })}
                onNavigate={close}
                trailing={<ChevronRight size={16} aria-hidden className="shrink-0 opacity-40" />}
              />
            ))}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
