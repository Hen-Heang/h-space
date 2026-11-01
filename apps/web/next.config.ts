import type { NextConfig } from "next"

import { buildContentSecurityPolicy } from "./lib/csp"

const contentSecurityPolicy = buildContentSecurityPolicy({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  authApiUrl: process.env.NEXT_PUBLIC_AUTH_API_URL,
  hspaceApiUrl: process.env.NEXT_PUBLIC_HSPACE_API_URL,
  development: process.env.NODE_ENV === "development",
  vercelPreview: process.env.VERCEL_ENV === "preview",
})

const nextConfig: NextConfig = {
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
