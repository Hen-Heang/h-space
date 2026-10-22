import { MyAppsSection } from "@/components/home/MyAppsSection"

// The My Apps workspace: the full project catalog from `lib/projects.ts`,
// the same one the public landing page shows. Phase 3 of the H-Space upgrade
// extends the catalog itself (purpose, architecture, status) — not this page.
export default function AppsPage() {
  return <MyAppsSection className="pb-12" />
}
