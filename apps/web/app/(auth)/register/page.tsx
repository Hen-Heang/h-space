"use client"

import Link from "next/link"
import { ArrowRight, UserPlus } from "lucide-react"

import { AuthHeading, AuthShell, authLinkClass } from "@/components/auth/auth-shell"
import { cn } from "@/lib/utils"

// H-Space has no self sign-up since sign-in moved to Supabase Auth
// (2026-11-21, docs/SPRING_EXIT_PLAN.md): the owner adds people in the
// Supabase dashboard, and they sign in with an email code. The route stays so
// old links and the login page's "Get access" link still land somewhere.
export default function RegisterPage() {
  return (
    <AuthShell>
      <AuthHeading
        icon={UserPlus}
        title="H-Space is invite-only"
        description="H-Space is a private space, so accounts are added by its owner. If you've been added, sign in with an email code — no password needed."
      />
      <div className="flex flex-col gap-3 text-sm">
        <Link
          href="/login?method=email-code"
          className={cn(authLinkClass, "inline-flex items-center gap-1.5")}
        >
          Sign in with an email code <ArrowRight size={15} />
        </Link>
        <Link href="/login" className={cn(authLinkClass, "inline-flex items-center gap-1.5")}>
          Sign in with a password <ArrowRight size={15} />
        </Link>
      </div>
    </AuthShell>
  )
}
