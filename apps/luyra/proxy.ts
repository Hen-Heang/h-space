import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const PAUSED_HENGO_ROUTES = ["/today", "/tasks", "/goals", "/habits", "/learning"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPausedHengoRoute = PAUSED_HENGO_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isPausedHengoRoute) {
    const moneyFlowUrl = request.nextUrl.clone();
    moneyFlowUrl.pathname = "/finance";
    moneyFlowUrl.search = "";
    return NextResponse.redirect(moneyFlowUrl);
  }

  return updateSession(request);
}

export const config = {
  // manifest.webmanifest, icons, and sw.js must stay reachable without a
  // session — the OS/browser fetches them for PWA install/offline caching,
  // not as an authenticated user request. Brand image assets are excluded
  // too — next/image's server-side optimizer fetches them without forwarding
  // the browser's auth cookie, so a gated request would 500 (received the
  // /login redirect instead of image bytes). Workflow SDK internal paths
  // under /.well-known/workflow/ are excluded too — the SDK POSTs to them to
  // drive workflow execution, and proxying those requests breaks the run.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|\\.well-known/workflow/|icon\\.png|manifest.webmanifest|icons|sw.js|api|luyra-mark-v2\\.png|luyra-logo\\.png).*)",
  ],
};
