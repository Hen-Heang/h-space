"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryIcon } from "@/components/finance/ui/finance-primitives";
import { SUBSCRIPTION_STATUS_META } from "@/components/finance/subscriptions/subscription-status";
import { krw } from "@/lib/finance-format";
import { cn } from "@/lib/utils";
import type { DetectedSubscription, SubscriptionStatus } from "@/types/finance";

const STATUS_OPTIONS: SubscriptionStatus[] = ["keep", "review", "plan_to_cancel", "cancelled"];

const FREQUENCY_LABEL: Record<DetectedSubscription["frequency"], string> = {
  monthly: "Monthly",
  yearly: "Yearly",
  irregular: "Irregular",
};

function formatLastCharge(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function SubscriptionCard({
  subscription,
  saving,
  onStatusChange,
}: {
  subscription: DetectedSubscription;
  saving: boolean;
  onStatusChange: (status: SubscriptionStatus) => void;
}) {
  const status = SUBSCRIPTION_STATUS_META[subscription.status];
  const StatusIcon = status.icon;
  const cancelled = subscription.status === "cancelled";

  return (
    <div className={cn("rounded-2xl border bg-card p-4", cancelled && "opacity-70")}>
      <div className="flex items-start gap-3">
        <CategoryIcon icon={subscription.categoryIcon} color={subscription.categoryColor} />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-semibold", cancelled && "line-through")}>{subscription.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {FREQUENCY_LABEL[subscription.frequency]} · Last charge {formatLastCharge(subscription.lastPaymentDate)}
            {subscription.categoryName ? ` · ${subscription.categoryName}` : ""}
          </p>
        </div>
        <div className="max-w-[45%] shrink-0 text-right">
          <p className="[overflow-wrap:anywhere] font-mono text-xs font-semibold tabular-nums xs:text-sm">{krw.format(subscription.latestAmountKrw)}</p>
          <p className="text-xs text-muted-foreground">latest</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Avg {krw.format(subscription.averageAmountKrw)} · Est. {krw.format(subscription.estimatedYearlyCostKrw)}/yr
        </p>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={saving}
              className={cn(
                "flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors disabled:opacity-50 sm:min-h-9",
                status.textClass,
                "border-current/25 hover:bg-secondary active:bg-secondary"
              )}
              aria-label={`Change status for ${subscription.name}, currently ${status.label}`}
            >
              <StatusIcon className="size-3.5" aria-hidden="true" />
              {status.label}
              <ChevronDown className="size-3.5" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {STATUS_OPTIONS.map((option) => {
              const optionMeta = SUBSCRIPTION_STATUS_META[option];
              const OptionIcon = optionMeta.icon;
              return (
                <DropdownMenuItem key={option} onSelect={() => onStatusChange(option)} disabled={option === subscription.status}>
                  <OptionIcon className={cn("size-4", optionMeta.textClass)} aria-hidden="true" />
                  {optionMeta.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
