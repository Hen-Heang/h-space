"use client"

import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/finance/base/dropdown-menu"
import { AmountText, CategoryIcon } from "@/components/finance/ui/finance-primitives"
import { SUBSCRIPTION_STATUS_META } from "@/components/finance/subscriptions/subscription-status"
import { krw } from "@/lib/finance-format"
import { formatLastCharge, SUBSCRIPTION_FREQUENCY_LABEL } from "@/lib/finance/subscriptions-display"
import { cn } from "@/lib/utils"
import type { DetectedSubscription, SubscriptionStatus } from "@/types/finance"

const STATUS_OPTIONS: SubscriptionStatus[] = ["keep", "review", "plan_to_cancel", "cancelled"]

/**
 * One detected subscription as a row: name and latest amount on the first
 * line, frequency · last charge · category below, then the average and
 * yearly estimate beside the status menu. The row itself isn't a button —
 * the status menu is its one control.
 */
export function SubscriptionRow({
  subscription,
  saving,
  onStatusChange,
}: {
  subscription: DetectedSubscription
  saving: boolean
  onStatusChange: (status: SubscriptionStatus) => void
}) {
  const status = SUBSCRIPTION_STATUS_META[subscription.status]
  const StatusIcon = status.icon
  const cancelled = subscription.status === "cancelled"

  return (
    <li className="flex min-w-0 items-start gap-3 px-3 py-3 sm:px-4">
      <CategoryIcon
        icon={subscription.categoryIcon}
        color={subscription.categoryColor}
        className={cn("mt-0.5 size-9 rounded-lg border-0 text-base", cancelled && "opacity-60")}
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <p
            className={cn(
              "line-clamp-2 min-w-0 flex-1 break-words text-base font-medium leading-snug",
              cancelled && "text-muted-foreground line-through",
            )}
          >
            {subscription.name}
          </p>
          <p
            className={cn(
              // Capped so a huge amount wraps between digit groups instead of
              // squeezing the name.
              "max-w-[55%] shrink-0 text-right text-base font-semibold leading-snug tracking-tight [overflow-wrap:anywhere] tabular-nums",
              cancelled && "text-muted-foreground",
            )}
          >
            <span className="sr-only">Latest charge </span>
            <AmountText value={krw.format(subscription.latestAmountKrw)} />
          </p>
        </div>
        <p className="mt-0.5 break-words text-sm text-muted-foreground">
          {SUBSCRIPTION_FREQUENCY_LABEL[subscription.frequency]} · Last charge{" "}
          {formatLastCharge(subscription.lastPaymentDate)}
          {subscription.categoryName ? ` · ${subscription.categoryName}` : ""}
        </p>

        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3">
          <p className="min-w-0 [overflow-wrap:anywhere] text-sm text-muted-foreground tabular-nums">
            Avg {krw.format(subscription.averageAmountKrw)} · Est.{" "}
            {krw.format(subscription.estimatedYearlyCostKrw)}/yr
          </p>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={saving}
                className={cn(
                  "-mr-2 ml-auto flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-secondary disabled:opacity-50",
                  status.textClass,
                )}
                aria-label={`Change status for ${subscription.name}, currently ${status.label}`}
              >
                <StatusIcon className="size-4 shrink-0" aria-hidden="true" />
                {status.label}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {STATUS_OPTIONS.map((option) => {
                const optionMeta = SUBSCRIPTION_STATUS_META[option]
                const OptionIcon = optionMeta.icon
                return (
                  <DropdownMenuItem
                    key={option}
                    onSelect={() => onStatusChange(option)}
                    disabled={option === subscription.status}
                  >
                    <OptionIcon className={cn("size-4", optionMeta.textClass)} aria-hidden="true" />
                    {optionMeta.label}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  )
}
