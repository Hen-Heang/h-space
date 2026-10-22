import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

// Unmatched URLs, plus notFound() calls (e.g. a habit id that doesn't exist
// or belongs to someone else). Renders inside the root layout only — no
// AppShell — so it works whether or not the visitor is signed in.
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex max-w-sm flex-col items-center text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
          <SearchX className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-base font-semibold">Page not found</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          This page doesn&apos;t exist, or you don&apos;t have access to it.
        </p>
        <Link href="/finance" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-6 min-h-11" })}>
          Go to Finance
        </Link>
      </div>
    </main>
  );
}
