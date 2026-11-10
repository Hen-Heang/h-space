import type { NextConfig } from "next"

import { buildContentSecurityPolicy } from "./lib/csp"
import { isNotesEnabled } from "./lib/feature-flags"

const contentSecurityPolicy = buildContentSecurityPolicy({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  authApiUrl: process.env.NEXT_PUBLIC_AUTH_API_URL,
  hspaceApiUrl: process.env.NEXT_PUBLIC_HSPACE_API_URL,
  development: process.env.NODE_ENV === "development",
  vercelPreview: process.env.VERCEL_ENV === "preview",
})

const nextConfig: NextConfig = {
  // Notes is retired unless NEXT_PUBLIC_FEATURE_NOTES=true (lib/feature-flags.ts):
  // old /notes bookmarks get a real HTTP redirect to the Inbox before anything
  // renders. Temporary (307), not permanent, so browsers don't cache it and
  // turning the flag back on works immediately. app/(main)/notes/layout.tsx
  // redirects too, so the Notes pages never mount even without this rule.
  async redirects() {
    if (isNotesEnabled()) return []
    return [
      { source: "/notes", destination: "/inbox", permanent: false },
      { source: "/notes/:path*", destination: "/inbox", permanent: false },
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ]
  },
}

export default nextConfig
