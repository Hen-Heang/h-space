import Link from "next/link"
import {
  AppWindow,
  ArrowUpRight,
  BriefcaseBusiness,
  Github,
  GraduationCap,
  Landmark,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react"

import { hSpaceProjects, type HSpaceProject } from "@/lib/projects"
import { cn } from "@/lib/utils"

const projectIcons: Record<HSpaceProject["id"], LucideIcon> = {
  "hengo-learning": GraduationCap,
  "money-flow": Landmark,
  luyra: AppWindow,
  "h-phsar": ShoppingBag,
  portfolio: BriefcaseBusiness,
}

function ProjectLink({ link }: { link: HSpaceProject["links"][number] }) {
  const className =
    "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
  const content = (
    <>
      {link.kind === "github" ? (
        <Github className="size-4" aria-hidden="true" />
      ) : (
        <ArrowUpRight className="size-4" aria-hidden="true" />
      )}
      {link.label}
    </>
  )

  if (link.href.startsWith("/")) {
    return (
      <Link href={link.href} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <a href={link.href} target="_blank" rel="noreferrer" className={className}>
      {content}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

/**
 * `compact` is the private /home variant: the same catalog without the
 * portfolio intro and stack chips that the public landing page shows.
 */
export function MyAppsSection({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return (
    <section id="my-apps" aria-labelledby="my-apps-title" className={cn("scroll-mt-24", className)}>
      <div className="mb-6 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
          Connected work
        </p>
        <h2
          id="my-apps-title"
          className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          My Apps
        </h2>
        {!compact && (
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
            Real applications I use, maintain, and discuss in engineering interviews. Each project
            solves a different problem while documenting the product and technical decisions behind
            it.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {hSpaceProjects.map((project) => {
          const Icon = projectIcons[project.id]
          return (
            <article
              key={project.id}
              className="flex min-h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-blue-500/35 dark:bg-slate-900/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
                </div>
                <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  {project.area}
                </span>
              </div>

              <h3 className="mt-5 text-lg font-semibold text-foreground">{project.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                {project.description}
              </p>

              {!compact && (
                <ul
                  aria-label={`${project.name} technology stack`}
                  className="mt-4 flex flex-wrap gap-1.5"
                >
                  {project.stack.map((technology) => (
                    <li
                      key={technology}
                      className="rounded-md bg-muted/60 px-2 py-1 text-[11px] font-medium text-muted-foreground"
                    >
                      {technology}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-5 flex flex-wrap gap-1 border-t border-border pt-3">
                {project.links.map((link) => (
                  <ProjectLink key={`${project.id}-${link.label}`} link={link} />
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
