"use client"

import { useEffect, useMemo, useState } from "react"
import { List } from "lucide-react"
import { cn } from "@/lib/utils"

export function TableOfContents({ html, mobile = false }: { html: string; mobile?: boolean }) {
  const [activeId, setActiveId] = useState<string>("")

  const toc = useMemo(() => {
    if (typeof window === "undefined") return []
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")
    const headings = Array.from(doc.querySelectorAll("h2, h3"))

    return headings.map((heading) => ({
      id:
        heading.id ||
        heading.textContent
          ?.toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-") ||
        "",
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
    <nav className={mobile ? "w-full p-4" : "p-4"}>
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        <List size={14} />
        Table of Contents
      </div>

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
                document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" })
                setActiveId(item.id)
              }}
              className={cn(
                "block py-1.5 text-xs font-medium transition-colors hover:text-foreground",
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
