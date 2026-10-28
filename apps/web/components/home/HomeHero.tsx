import Link from "next/link"
import { ArrowUpRight, Sparkles } from "lucide-react"

/**
 * Overview's banner (Figma "Hero / focus"): one dark card pointing at the My
 * Apps workspace. Purely presentational — no data, so no loading state.
 */
export function HomeHero() {
  return (
    <section
      aria-labelledby="home-hero-title"
      className="relative isolate overflow-hidden rounded-3xl bg-brand-surface px-6 py-7 text-white shadow-lg shadow-brand-surface/15 sm:px-8 sm:py-8"
    >
      {/* Decor orbs */}
      <div
        aria-hidden
        className="absolute -right-10 -top-24 -z-10 size-72 rounded-full bg-white/[0.06]"
      />
      <div
        aria-hidden
        className="absolute -bottom-24 right-6 -z-10 size-52 rounded-full bg-[#6757f5]/45 sm:right-28"
      />

      <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/90">
        <Sparkles size={12} aria-hidden="true" />
        Your daily space
      </p>
      <h3
        id="home-hero-title"
        className="mt-4 max-w-xl text-2xl font-bold tracking-tight sm:text-[28px]"
      >
        Everything you need, in one place.
      </h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
        Your projects, progress, and daily essentials — all together.
      </p>
      <Link
        href="/apps"
        className="mt-5 inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-semibold text-brand-surface outline-none transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface"
      >
        Explore My Apps
        <ArrowUpRight size={15} aria-hidden="true" />
      </Link>
    </section>
  )
}
