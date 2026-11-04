"use client"

import { useEffect } from "react"
import { RotateCw } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Error</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">This page hit a snag</h1>
      <p className="mt-3 max-w-sm text-sm font-medium text-muted-foreground">
        Something went wrong loading this page. Your navigation is still available above.
      </p>

      <Button
        onClick={reset}
        className="mt-8 h-11 rounded-xl bg-blue-600 px-6 font-semibold hover:bg-blue-500"
      >
        <RotateCw size={18} strokeWidth={2} className="mr-2" />
        Try again
      </Button>
    </div>
  )
}
