"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export interface HideOnScrollOptions {
  /** Ignore scroll movements smaller than this (px), so a jittery finger doesn't flicker it. */
  threshold?: number
  /** Always shown while the page is scrolled less than this (px). */
  topOffset?: number
}

/**
 * Whether a floating control should be hidden after a scroll from `lastY` to
 * `y`: hidden while scrolling down, shown again on scrolling up or near the
 * top. Movements under `threshold` keep the current state.
 */
export function nextHiddenOnScroll(
  hidden: boolean,
  lastY: number,
  y: number,
  { threshold = 8, topOffset = 64 }: HideOnScrollOptions = {},
): boolean {
  if (y <= topOffset) return false
  const delta = y - lastY
  if (delta > threshold) return true
  if (delta < -threshold) return false
  return hidden
}

/**
 * Hides a floating control (e.g. the mobile AI launcher) while the page is
 * scrolled down, so it doesn't sit on top of the content being read, and
 * brings it back on the first scroll up. Returns `[hidden, reveal]`; call
 * `reveal` when the control gets keyboard focus so it's never focused while
 * invisible. Disabled → always visible.
 */
export function useHideOnScroll(
  enabled: boolean,
  options: HideOnScrollOptions = {},
): [hidden: boolean, reveal: () => void] {
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)
  const { threshold, topOffset } = options

  useEffect(() => {
    // Disabled reads as visible (see the return below); the cleanup resets
    // state, so re-enabling never starts from a stale "hidden".
    if (!enabled) return
    lastY.current = window.scrollY
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        const y = window.scrollY
        setHidden((current) => nextHiddenOnScroll(current, lastY.current, y, { threshold, topOffset }))
        lastY.current = y
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (frame) window.cancelAnimationFrame(frame)
      setHidden(false)
    }
  }, [enabled, threshold, topOffset])

  const reveal = useCallback(() => setHidden(false), [])
  return [enabled && hidden, reveal]
}
