"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type Breadcrumb = { label: string; href?: string };

/**
 * Reusable page-header API.
 *
 * ```tsx
 * <PageHeader title="Goals" actions={<CreateGoalButton />} />
 * ```
 *
 * Deliberately additive: `DesktopHeader` derives its own title from the nav
 * model, so existing pages keep working untouched and can adopt this
 * incrementally for a section title + actions row.
 */
export function PageHeader({
  title,
  breadcrumb,
  description,
  actions,
  className,
}: {
  title: string;
  breadcrumb?: Breadcrumb[];
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3 pb-4", className)}>
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 && <BreadcrumbTrail items={breadcrumb} />}
        <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function BreadcrumbTrail({ items, className }: { items: Breadcrumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 items-center gap-1 text-xs font-medium text-muted-foreground">
        {items.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
            {index > 0 && <ChevronRight size={12} aria-hidden className="shrink-0 opacity-60" />}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="relative block truncate rounded outline-none before:absolute before:-inset-x-2 before:-inset-y-3.5 before:content-[''] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="truncate">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
