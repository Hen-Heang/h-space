// Instant fallback for app routes that do server work before rendering
// (session check, Neon queries), such as Account and the Hengo routes once
// they are un-paused in proxy.ts.
// Finance has its own, more specific loading.tsx. Kept generic: a heading
// strip and neutral blocks, never placeholder content.
export default function AppLoading() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-secondary motion-safe:animate-pulse" />
        <div className="h-6 w-48 rounded bg-secondary motion-safe:animate-pulse" />
      </div>
      <div className="h-32 rounded-2xl bg-secondary motion-safe:animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-16 rounded-2xl bg-secondary motion-safe:animate-pulse" />
        ))}
      </div>
    </div>
  );
}
