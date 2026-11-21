import { redirect } from "next/navigation"

// Landing page for a link h-space-api (Spring) used to email. Sign-in moved
// to Supabase Auth on 2026-11-21 (docs/SPRING_EXIT_PLAN.md) and those links
// no longer mean anything, so an old one goes to sign-in. Kept so the URL
// doesn't 404.
export default function LegacyAuthLinkPage() {
  redirect("/login")
}
