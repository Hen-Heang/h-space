// Instant fallback while a Finance route's server work (session check, Neon
// queries) streams in. It wraps every Finance page, so it stays generic — a
// header strip and neutral blocks, never numbers or placeholder amounts.
export default function FinanceLoading() {
  return (
    <div className="space-y-6 lg:space-y-7" aria-busy="true" aria-label="Loading Finance">
      <div className="flex items-center gap-3">
        <div className="size-10 shrink-0 rounded-full bg-secondary motion-safe:animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-secondary motion-safe:animate-pulse" />
          <div className="h-5 w-40 rounded bg-secondary motion-safe:animate-pulse" />
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="h-64 rounded-2xl bg-secondary motion-safe:animate-pulse lg:h-auto" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-36 rounded-2xl bg-secondary motion-safe:animate-pulse" />
          ))}
        </div>
      </div>
      <div className="h-40 rounded-2xl bg-secondary motion-safe:animate-pulse" />
    </div>
  );
}
