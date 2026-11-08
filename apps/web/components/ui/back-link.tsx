import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Ghost "← Label" link used as a page-top back affordance. Pages whose only
// other way out is the desktop sidebar render this; pass `mobileOnly` on
// workspace root pages where the desktop sidebar already covers navigation.
//
// `desktopOnly` is the complement, for detail routes: below 768px AppShell
// mounts MobileHeader, which already draws a back button, so rendering this
// too puts two back controls ~70px apart. 768px (Tailwind's `md`) is the
// exact boundary MobileHeader itself uses — see hooks/useNavigationMode.ts's
// TABLET_MIN_WIDTH — so the two never both show and never both hide.
export function BackLink({
  href,
  label,
  mobileOnly = false,
  desktopOnly = false,
  className,
}: {
  href: string
  label: string
  mobileOnly?: boolean
  desktopOnly?: boolean
  className?: string
}) {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={cn(
        "-ml-2",
        mobileOnly && "lg:hidden",
        desktopOnly && "hidden md:inline-flex",
        className,
      )}
    >
      <Link href={href}>
        <ArrowLeft size={16} />
        {label}
      </Link>
    </Button>
  )
}
