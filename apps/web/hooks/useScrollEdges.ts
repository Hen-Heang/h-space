"use client"

import { useCallback, useEffect, useState, type CSSProperties } from "react"

export interface ScrollEdges {
  /** More content is hidden to the left. */
  left: boolean
  /** More content is hidden to the right. */
  right: boolean
}

/** Which sides of a horizontal scroller still hide content (1px tolerance for subpixel widths). */
export function scrollEdges(scrollLeft: number, scrollWidth: number, clientWidth: number): ScrollEdges {
  return {
    left: scrollLeft > 1,
    right: scrollLeft + clientWidth < scrollWidth - 1,
  }
}

/**
 * A mask that fades the side(s) of a horizontal scroller that hide more
 * content — a quiet cue that the row scrolls, with no extra elements.
 * Undefined when nothing is hidden, so the row renders unmasked.
 */
export function edgeFadeStyle({ left, right }: ScrollEdges, fade = 28): CSSProperties | undefined {
  if (!left && !right) return undefined
  const start = left ? `transparent, black ${fade}px` : "black"
  const end = right ? `black calc(100% - ${fade}px), transparent` : "black"
  const image = `linear-gradient(to right, ${start}, ${end})`
  return { maskImage: image, WebkitMaskImage: image }
}

/**
 * Tracks whether a horizontal scroller has hidden content on either side.
 * Pass the returned callback as the scroller's `ref`; it re-checks on scroll
 * and whenever the scroller or its content changes size.
 */
export function useScrollEdges(): [ref: (node: HTMLElement | null) => void, edges: ScrollEdges] {
  const [node, setNode] = useState<HTMLElement | null>(null)
  const [edges, setEdges] = useState<ScrollEdges>({ left: false, right: false })

  useEffect(() => {
    if (!node) return
    const update = () => {
      const next = scrollEdges(node.scrollLeft, node.scrollWidth, node.clientWidth)
      setEdges((current) =>
        current.left === next.left && current.right === next.right ? current : next,
      )
    }
    update()
    node.addEventListener("scroll", update, { passive: true })
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update)
    observer?.observe(node)
    if (node.firstElementChild) observer?.observe(node.firstElementChild)
    return () => {
      node.removeEventListener("scroll", update)
      observer?.disconnect()
    }
  }, [node])

  const ref = useCallback((element: HTMLElement | null) => setNode(element), [])
  return [ref, edges]
}
