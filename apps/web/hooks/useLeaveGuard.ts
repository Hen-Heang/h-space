"use client"

import { useEffect } from "react"

/**
 * While `active`, a reload, tab close, or external navigation asks the
 * browser's own "Leave site?" question first — for in-progress study sessions
 * whose state lives only in the page (no URL or storage to resume from).
 * In-app links aren't covered; pair this with a confirm dialog on the
 * session's own exit button.
 */
export function useLeaveGuard(active: boolean) {
  useEffect(() => {
    if (!active) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Legacy browsers only show the prompt when returnValue is set.
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [active])
}
