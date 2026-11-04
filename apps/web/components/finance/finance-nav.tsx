"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Local navigation for the Finance area while it moves in from Luyra
// (docs/LUYRA_MIGRATION.md). Lists only the screens already ported; add each
// one here as its slice lands.
const FINANCE_LINKS = [
  { href: "/finance", label: "Overview" },
  { href: "/finance/transactions", label: "Transactions" },
  { href: "/finance/budgets", label: "Budgets" },
  { href: "/finance/analytics", label: "Analytics" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/finance") return pathname === "/finance";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function FinanceNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Finance" className="-mx-1 overflow-x-auto px-1">
      <ul className="flex min-w-max gap-1 rounded-xl border border-border bg-card p-1">
        {FINANCE_LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring md:min-h-9",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
