"use client"

import { useEffect, useMemo, useState } from "react"
import { List } from "lucide-react"
import { cn } from "@/lib/utils"

export function TableOfContents({
  html,
  mobile = false,
  onNavigate,
}: {
  html: string
  mobile?: boolean
  /**
   * Called when a heading is chosen. The phone sheet closes here; the scroll
   * waits for the sheet to let go of the page (its scroll lock).
   */
  onNavigate?: () => void
}) {
  const [activeId, setActiveId] = useState<string>("")

  const toc = useMemo(() => {
    if (typeof window === "undefined") return []
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")
    const headings = Array.from(doc.querySelectorAll("h2, h3"))

    // renderMarkdown gives every h2/h3 a unique id; one without an id can't
    // be jumped to, so it's left out rather than linked to "#".
    return headings
      .filter((heading) => heading.id)
      .map((heading) => ({
        id: heading.id,
        text: heading.textContent || "",
        level: parseInt(heading.tagName.substring(1)),
      }))
  }, [html])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((entry) => entry.isIntersecting)
        if (visibleEntry) {
          setActiveId(visibleEntry.target.id)
        }
      },
      { rootMargin: "-100px 0% -80% 0%" },
    )

    const headingElements = document.querySelectorAll("h2, h3")
    headingElements.forEach((element) => observer.observe(element))

    return () => {
      headingElements.forEach((element) => observer.unobserve(element))
    }
  }, [toc])

  if (toc.length === 0) return null

  return (
    <nav aria-label="Contents" className={mobile ? "w-full px-4 pb-4" : "p-4"}>
      {!mobile && (
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <List size={14} aria-hidden="true" />
          Contents
        </div>
      )}

      <ul className="relative space-y-1">
        <div className="absolute bottom-0 left-0 top-0 w-px bg-border" />

        {toc.map((item, index) => (
          <li
            key={`${item.id}-${index}`}
            className={cn(
              "group relative pl-4 transition-all duration-200",
              item.level === 3 ? "ml-4" : "",
            )}
          >
            <div
              className={cn(
                "absolute left-[-0.5px] top-1/2 h-full w-px -translate-y-1/2 bg-transparent transition-colors group-hover:bg-muted-foreground/40",
                activeId === item.id ? "z-10 h-full w-[2px] bg-blue-500" : "",
              )}
            />

            <a
              href={`#${item.id}`}
              onClick={(event) => {
                event.preventDefault()
                setActiveId(item.id)
                const scroll = () =>
                  document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" })
                if (onNavigate) {
                  onNavigate()
                  window.setTimeout(scroll, 250)
                } else {
                  scroll()
                }
              }}
              className={cn(
                "block py-1.5 font-medium transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                mobile ? "flex min-h-11 items-center text-sm" : "text-xs",
                activeId === item.id ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground",
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
