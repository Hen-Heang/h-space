"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, RotateCw } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function AppError({
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center text-foreground">
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl shadow-sm ring-1 ring-border/50">
        <Image
          src="/hengo-icon.png"
          alt="H-Space logo"
          width={56}
          height={56}
          className="h-full w-full"
        />
      </div>

      <p className="mt-8 text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
        Error
      </p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-sm text-sm font-medium text-muted-foreground">
        An unexpected error occurred. You can try again or head back home.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={reset}
          className="h-11 rounded-xl bg-blue-600 px-6 font-semibold hover:bg-blue-500"
        >
          <RotateCw size={18} strokeWidth={2} className="mr-2" />
          Try again
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-11 rounded-xl border-border bg-background/50 px-6 font-medium backdrop-blur-sm"
        >
          <Link href="/">
            <ArrowLeft size={18} strokeWidth={2} className="mr-2" />
            Go home
          </Link>
        </Button>
      </div>
    </div>
  )
}
