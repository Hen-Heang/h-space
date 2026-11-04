"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

// Local navigation for the Finance area while it moves in from Luyra
// (docs/LUYRA_MIGRATION.md). Lists only the screens already ported; add each
// one here as its slice lands.
const FINANCE_LINKS = [
  { href: "/finance", label: "Overview" },
  { href: "/finance/transactions", label: "Transactions" },
  { href: "/finance/budgets", label: "Budgets" },
  { href: "/finance/savings", label: "Savings" },
  { href: "/finance/subscriptions", label: "Subscriptions" },
  { href: "/finance/review", label: "Review" },
  { href: "/finance/analytics", label: "Analytics" },
  { href: "/finance/settings", label: "Settings" },
] as const

function isActive(pathname: string, href: string): boolean {
  if (href === "/finance") return pathname === "/finance"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function FinanceNav() {
  const pathname = usePathname() ?? ""

  return (
    <nav aria-label="Finance sections" className="-mx-1 px-1 sm:overflow-x-auto">
      <ul className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1 min-[400px]:grid-cols-3 sm:flex sm:min-w-max">
        {FINANCE_LINKS.map((link) => {
          const active = isActive(pathname, link.href)
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 w-full items-center justify-center whitespace-nowrap rounded-lg px-2 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9 sm:w-auto sm:px-3 sm:text-sm",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
