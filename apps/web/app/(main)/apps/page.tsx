import { AppsCatalog } from "@/components/apps/AppsCatalog"
import { WorkspaceTabs } from "@/components/layout/WorkspaceTabs"

// The My Apps workspace: the private catalog of the projects in
// `lib/projects.ts` (search, categories, favorites). The public landing page
// shows the same facts as a portfolio through `MyAppsSection`.
export default function AppsPage() {
  return (
    <div className="space-y-5 pb-12">
      <div className="space-y-3">
        <WorkspaceTabs sectionId="apps" />
        <p className="text-sm text-muted-foreground">
          The applications I build and use — open one, or jump to its code.
        </p>
      </div>
      <AppsCatalog />
    </div>
  )
}
