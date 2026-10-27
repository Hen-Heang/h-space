import { Suspense } from "react";
import { ReportsPrintView } from "./reports-print-view";

export default function ReportsPrintPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <ReportsPrintView />
    </Suspense>
  );
}
