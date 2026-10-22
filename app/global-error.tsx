"use client";

import { useEffect } from "react";
import "./globals.css";

// Last-resort boundary for errors in the root layout itself. It replaces the
// whole document, so it brings its own <html>/<body> and imports the global
// stylesheet directly; it deliberately avoids app components that might be
// what failed.
export default function GlobalError({
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
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full items-center justify-center bg-background px-4 font-sans text-foreground">
        <title>Something went wrong · Luyra</title>
        <div className="flex max-w-sm flex-col items-center text-center" role="alert">
          <h1 className="text-base font-semibold">Luyra couldn&apos;t load</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Something went wrong on our side. Your data is safe — try again in a moment.
          </p>
          {error.digest ? <p className="mt-2 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p> : null}
          <button
            type="button"
            onClick={() => retry()}
            className="mt-6 min-h-11 rounded-md border border-border px-4 text-sm font-medium hover:bg-secondary"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
