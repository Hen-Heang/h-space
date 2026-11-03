import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

/**
 * Overview's "Your daily space" strip: the H-Space promise and the door to My
 * Apps, kept in the brand indigo but as one slim line below the daily work
 * rather than a hero banner above it. Purely presentational — no data, so no
 * loading state.
 */
export function HomeHero() {
  return (
    <section
      aria-labelledby="home-hero-title"
      className="flex flex-col gap-3 rounded-lg bg-brand-surface px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <div className="min-w-0">
        <h3
          id="home-hero-title"
          // Explicit: globals.css gives every heading text-foreground, which
          // beats the inherited text-white.
          className="text-base font-semibold text-white"
        >
          Everything you need, in one place.
        </h3>
        <p className="mt-0.5 text-sm text-white/75">
          Your projects, progress, and daily essentials — all together.
        </p>
      </div>
      <Link
        href="/apps"
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start rounded-lg bg-white px-4 text-sm font-semibold text-brand-surface outline-none transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface sm:self-auto"
      >
        Explore My Apps
        <ArrowUpRight size={15} aria-hidden="true" />
      </Link>
    </section>
  )
}
