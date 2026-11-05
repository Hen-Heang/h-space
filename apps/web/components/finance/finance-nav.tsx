"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Check, ChevronDown } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/finance/base/dropdown-menu"
import { cn } from "@/lib/utils"

/**
 * Finance's local navigation: underline route tabs, the same pattern as
 * H-Space's `WorkspaceTabs` (docs/design-system.md §7), so it never grows into
 * a grid of pills.
 *
 * Eight destinations don't fit a phone, so the bar adapts by viewport:
 * - phones and tablets: Overview · Transactions · Budgets · More, with the
 *   rest in the More menu. Budgets also moves into More under 375px, where
 *   four tabs no longer fit, and under 640px while More carries a page name;
 * - ≥1280px (`xl`, where the content column is wide enough even beside the
 *   sidebar): all eight in one row, and no More.
 * Viewport media queries rather than container queries, because the menu is
 * portaled out of the bar and has to hide the same entries the bar shows.
 *
 * Every entry stays a real link, so deep links, back/forward, middle-click
 * and the keyboard behave as before. While an overflow page is open the More
 * tab carries that page's name and the active underline.
 */
type FinanceLink = {
  href: string
  label: string
  /** Where the link lives: always a tab, a tab from 375px, or a tab only at xl. */
  tier: "always" | "phone" | "wide"
}

export const FINANCE_LINKS: readonly FinanceLink[] = [
  { href: "/finance", label: "Overview", tier: "always" },
  { href: "/finance/transactions", label: "Transactions", tier: "always" },
  { href: "/finance/budgets", label: "Budgets", tier: "phone" },
  { href: "/finance/savings", label: "Savings", tier: "wide" },
  { href: "/finance/subscriptions", label: "Subscriptions", tier: "wide" },
  { href: "/finance/review", label: "Review", tier: "wide" },
  { href: "/finance/analytics", label: "Analytics", tier: "wide" },
  { href: "/finance/settings", label: "Settings", tier: "wide" },
]

export function isFinanceLinkActive(pathname: string, href: string): boolean {
  if (href === "/finance") return pathname === "/finance"
  return pathname === href || pathname.startsWith(`${href}/`)
}

const TAB =
  "relative flex min-h-11 items-center gap-1 whitespace-nowrap rounded-t-md border-b-2 px-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-3"
const TAB_IDLE = "border-transparent text-muted-foreground hover:text-foreground"
const TAB_CURRENT = "border-primary text-foreground"

export function FinanceNav() {
  const pathname = usePathname() ?? ""
  const active = FINANCE_LINKS.find((link) => isFinanceLinkActive(pathname, link.href))
  // While an overflow page is open, the More tab carries its name ("Review ▾")
  // so you can see where you are. That label is wider than "More", so on
  // phones Budgets steps into the menu to make room for it.
  const activeOverflow = active?.tier === "wide" ? active : undefined
  const budgetsActive = active?.tier === "phone"

  // Tab visibility in the bar, and its exact complement in the menu.
  const tabClass = (tier: FinanceLink["tier"]) =>
    tier === "always"
      ? ""
      : tier === "phone"
        ? activeOverflow
          ? "max-sm:hidden"
          : "max-[374px]:hidden"
        : "hidden xl:block"
  const menuClass = (tier: FinanceLink["tier"]) =>
    tier === "always"
      ? "hidden"
      : tier === "phone"
        ? activeOverflow
          ? "sm:hidden"
          : "min-[375px]:hidden"
        : ""

  return (
    <nav aria-label="Finance sections" className="min-w-0">
      {/* flex-wrap is the last resort (a 320px phone on "Subscriptions"):
          the row wraps rather than scrolling or clipping a tab. */}
      <ul className="flex flex-wrap items-end gap-x-0.5 shadow-[inset_0_-1px_0_var(--border)] sm:gap-x-1">
        {FINANCE_LINKS.map((link) => {
          const current = link === active
          return (
            <li key={link.href} className={tabClass(link.tier)}>
              <Link
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={cn(TAB, current ? TAB_CURRENT : TAB_IDLE)}
              >
                {link.label}
              </Link>
            </li>
          )
        })}
        <li className="xl:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                TAB,
                "data-[state=open]:text-foreground",
                activeOverflow ? TAB_CURRENT : TAB_IDLE,
                // Under 375px Budgets lives in the menu, so More is its tab there.
                budgetsActive && "max-[374px]:border-primary max-[374px]:text-foreground",
              )}
            >
              {activeOverflow ? (
                <span>
                  {activeOverflow.label}
                  <span className="sr-only">, more sections</span>
                </span>
              ) : budgetsActive ? (
                <>
                  <span className="min-[375px]:hidden">
                    Budgets<span className="sr-only">, more sections</span>
                  </span>
                  <span className="max-[374px]:hidden">More</span>
                </>
              ) : (
                <span>More</span>
              )}
              <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {FINANCE_LINKS.map((link) => {
                const current = link === active
                return (
                  <DropdownMenuItem
                    key={link.href}
                    asChild
                    className={cn(
                      "justify-between sm:min-h-10 sm:px-2.5",
                      menuClass(link.tier),
                      current && "font-semibold",
                    )}
                  >
                    <Link href={link.href} aria-current={current ? "page" : undefined}>
                      {link.label}
                      {current && <Check className="size-4 text-primary" aria-hidden="true" />}
                    </Link>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      </ul>
    </nav>
  )
}
