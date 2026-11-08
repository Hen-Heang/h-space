"use client"

import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { useProfileImage } from "@/hooks/useProfileImage"

type UserAvatarProps = {
  /** Tailwind sizing/shape overrides for the avatar box. */
  className?: string
  /** When set, the avatar becomes a link (e.g. to "/settings"). */
  href?: string
  /** Accessible label / tooltip. */
  title?: string
}

/**
 * The signed-in user's photo, with an initials fallback. Reads from the shared
 * session-cached profile-image hook, so it can be dropped anywhere (navbar,
 * chat header, …) without triggering extra network calls. Styled to match the
 * settings avatar: blue gradient with a small green "active" check badge.
 */
export function UserAvatar({ className, href, title = "Your profile" }: UserAvatarProps) {
  const { url, initials } = useProfileImage()

  const box = cn(
    "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-lg shadow-blue-500/20 ring-1 ring-border/50 transition-all",
    href && "group-hover:ring-blue-500/40",
    className,
  )

  const inner = url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="h-full w-full object-cover" />
  ) : (
    <span>{initials}</span>
  )

  const badge = (
    <span className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card bg-emerald-400">
      <CheckCircle2 size={8} className="text-white" />
    </span>
  )

  if (href) {
    return (
      <Link
        href={href}
        title={title}
        aria-label={title}
        className="group relative inline-flex transition-transform active:scale-95"
      >
        <span className={box}>{inner}</span>
        {badge}
      </Link>
    )
  }

  return (
    <span title={title} className="relative inline-flex">
      <span className={box}>{inner}</span>
      {badge}
    </span>
  )
}
