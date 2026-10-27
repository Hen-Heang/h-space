"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";

const TABS = [
  { href: "/learning", label: "Overview" },
  { href: "/learning/vocabulary", label: "Vocabulary" },
  { href: "/learning/daily-study", label: "Daily Study" },
];

export default function LearningLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title="Learning" className="pb-0" />

      <nav className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center px-3 py-2 text-sm",
              pathname === tab.href
                ? "border-b-2 border-primary font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
