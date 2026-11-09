"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MotionConfig } from "motion/react"
import { ThemeProvider } from "next-themes"
import { useState } from "react"

import { Toaster } from "@/components/ui/sonner"

export function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        {/* globals.css's prefers-reduced-motion rule only covers CSS; Motion's
            JS animations need this to skip transform/layout movement too. */}
        <MotionConfig reducedMotion="user">
          {children}
          <Toaster richColors position="top-right" />
        </MotionConfig>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
