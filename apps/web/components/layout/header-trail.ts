import {
  getActiveNavItem,
  getSectionForPath,
  linkPath,
  type NavSearchParams,
} from "@/lib/navigation"

import type { Breadcrumb } from "./PageHeader"

/**
 * The shell header's location: the page title plus, when it adds something,
 * its workspace as a parent crumb. The workspace is left out when it would
 * repeat the title ("Growth" on /growth), and is plain text rather than a
 * link when it would link back to the page you're on (Planner on /goals).
 */
export function getHeaderTrail(
  pathname: string,
  searchParams?: NavSearchParams,
): { title: string; crumbs: Breadcrumb[] } {
  const section = getSectionForPath(pathname, searchParams)
  const item = getActiveNavItem(pathname, searchParams)
  const title = item?.label ?? section?.label ?? "H-Space"

  const crumbs: Breadcrumb[] =
    section && section.label !== title
      ? [
          {
            label: section.label,
            href: linkPath(section.href) !== pathname ? section.href : undefined,
          },
        ]
      : []

  return { title, crumbs }
}
