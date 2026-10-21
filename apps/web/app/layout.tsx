import type { Metadata, Viewport } from "next"

import { AppProviders } from "@/components/providers/app-providers"

import "./globals.css"

// Tells the browser to shrink the visual viewport (and dvh units) when the
// virtual keyboard opens — keeps the chat input visible on mobile.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Allow pinch-zoom up to 5x — WCAG 1.4.4 (low-vision users must be able to
  // zoom). We intentionally do NOT set maximumScale: 1, which would lock it.
  maximumScale: 5,
  // Extend the layout under the notch/home indicator so env(safe-area-inset-*)
  // resolves to real values — without this every safe-area padding is 0 on iOS.
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  // Tint the iOS Safari / PWA status bar to match the app background in each
  // theme so the notch area blends into the page instead of showing white.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7fbfb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1422" },
  ],
}

const title = "H-Space — My Projects. One Space."
const description =
  "A personal software ecosystem for learning, finance, AI engineering, productivity, and development projects."

// Absolute base for resolving relative OG/Twitter image URLs. Without it Next
// falls back to http://localhost:3000 and every social card points at a machine
// nobody else can reach. Defaults to the production origin so a deploy that
// forgets to set the env var still emits correct absolute URLs.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://hengo.henheang.site"),
  title: {
    default: title,
    template: "%s · H-Space",
  },
  description,
  openGraph: {
    title,
    description,
    siteName: "H-Space",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon-32.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased" suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
