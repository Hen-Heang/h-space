import { Suspense } from "react"
import { ReportsPrintView } from "./reports-print-view"
import "../(main)/finance/luyra-theme.css"

// Printable weekly/monthly finance report (from Finance → Settings → Reports).
// Deliberately outside the (main) app shell so the print has no navigation
// chrome. Data still comes from /api/finance/* with the H-Space Bearer token;
// signed out, the view shows its error state.
export default function ReportsPrintPage() {
  return (
    <div className="luyra min-h-dvh bg-background">
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
        <ReportsPrintView />
      </Suspense>
    </div>
  )
}
