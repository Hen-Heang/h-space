"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CircleAlert, RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

// Catches render errors in any app route while keeping the AppShell (and its
// navigation) on screen. Data-fetch failures inside client views are handled
// by their own inline error states; this is the net for everything else.
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-4 rounded-2xl border border-destructive/25 bg-destructive/5 p-5" role="alert">
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
        <div>
          <h1 className="text-sm font-semibold">This page couldn&apos;t load</h1>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Something went wrong while showing this page. Your data is safe — try again, or go back to Finance.
          </p>
          {error.digest ? (
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">Reference: {error.digest}</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="min-h-11" onClick={() => retry()}>
          <RefreshCw aria-hidden="true" />
          Try again
        </Button>
        <Link href="/finance" className={buttonVariants({ variant: "ghost", size: "sm", className: "min-h-11" })}>
          Go to Finance
        </Link>
      </div>
    </div>
  );
}
