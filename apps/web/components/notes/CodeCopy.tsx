"use client"

import { useEffect } from "react"

// Attaches a "Copy" button to every rendered code block. Runs once after the
// article HTML mounts; idempotent via the `.copy-btn` guard.
export function CodeCopy() {
  useEffect(() => {
    const blocks = document.querySelectorAll<HTMLElement>(
      "article .shiki-wrapper, article pre:not(.shiki-wrapper pre)",
    )
    const isDark = document.documentElement.classList.contains("dark")

    blocks.forEach((pre) => {
      if (pre.querySelector(".copy-btn")) return

      pre.style.position = "relative"

      const btn = document.createElement("button")
      btn.className = "copy-btn"
      btn.textContent = "Copy"

      const darkBg = "#27272a"
      const darkText = "#a1a1aa"
      const darkBorder = "#3f3f46"
      const lightBg = "#e4e4e7"
      const lightText = "#52525b"
      const lightBorder = "#d4d4d8"

      const bg = isDark ? darkBg : lightBg
      const color = isDark ? darkText : lightText
      const border = isDark ? darkBorder : lightBorder

      btn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        font-size: 13px;
        font-family: var(--font-sans-stack);
        padding: 3px 10px;
        background: ${bg};
        color: ${color};
        border: 1px solid ${border};
        border-radius: 5px;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
        z-index: 10;
      `

      btn.addEventListener("mouseenter", () => {
        btn.style.background = isDark ? "#3f3f46" : "#d4d4d8"
        btn.style.color = isDark ? "#e4e4e7" : "#18181b"
      })
      btn.addEventListener("mouseleave", () => {
        if (btn.textContent !== "Copied!") {
          btn.style.background = bg
          btn.style.color = color
        }
      })

      btn.addEventListener("click", () => {
        const code = pre.querySelector("code")?.innerText ?? pre.innerText ?? ""
        navigator.clipboard.writeText(code).then(() => {
          btn.textContent = "Copied!"
          btn.style.background = "#172554"
          btn.style.color = "#60a5fa"
          btn.style.borderColor = "#60a5fa"
          setTimeout(() => {
            btn.textContent = "Copy"
            btn.style.background = bg
            btn.style.color = color
            btn.style.borderColor = border
          }, 2000)
        })
      })

      pre.appendChild(btn)
    })
  }, [])

  return null
}
