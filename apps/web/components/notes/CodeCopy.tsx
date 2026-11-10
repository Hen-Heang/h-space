"use client"

import { useEffect } from "react"

const RESET_MS = 2000

/**
 * Makes the "Copy" buttons in rendered note code blocks work. renderMarkdown
 * puts the button in each block's `.code-header`, so it survives React
 * re-applying the note HTML; this is one delegated click listener for all of
 * them. Styling lives in globals.css (`.code-copy`).
 */
export function CodeCopy() {
  useEffect(() => {
    const timers = new Set<number>()

    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const btn = target.closest<HTMLButtonElement>(".prose .shiki-wrapper .code-copy")
      if (!btn) return
      const code = btn.closest(".shiki-wrapper")?.querySelector("code")?.textContent ?? ""
      const show = (text: string, state?: string) => {
        btn.textContent = text
        if (state) btn.dataset.state = state
        else delete btn.dataset.state
      }
      navigator.clipboard.writeText(code).then(
        () => show("Copied", "copied"),
        () => show("Couldn't copy"),
      )
      const timer = window.setTimeout(() => {
        show("Copy")
        timers.delete(timer)
      }, RESET_MS)
      timers.add(timer)
    }

    document.addEventListener("click", onClick)
    return () => {
      document.removeEventListener("click", onClick)
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  return null
}
