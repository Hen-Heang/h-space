// Where Web Push can work on this device. Kept free of the push API client so
// it stays a plain, testable function.

export interface PushEnvironment {
  userAgent: string
  maxTouchPoints: number
  /** Running as an installed Home Screen web app rather than a browser tab. */
  standalone: boolean
}

/**
 * iPhone and iPad only expose Web Push to a site added to the Home Screen and
 * opened from that icon (iOS 16.4+). In a Safari tab PushManager is simply
 * missing, so without this check the page could only say "not supported".
 * iPadOS reports a desktop Mac user agent, so a Mac UA with touch counts too.
 */
export function needsHomeScreenForPush(env: PushEnvironment): boolean {
  const isAppleMobile =
    /iPhone|iPad|iPod/.test(env.userAgent) ||
    (/Macintosh/.test(env.userAgent) && env.maxTouchPoints > 1)
  return isAppleMobile && !env.standalone
}

export function readPushEnvironment(): PushEnvironment | null {
  if (typeof window === "undefined") return null
  const legacyStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return {
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    standalone:
      legacyStandalone ||
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(display-mode: standalone)").matches),
  }
}
