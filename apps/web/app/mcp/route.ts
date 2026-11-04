// Streamable HTTP MCP endpoint — POST/GET/DELETE /mcp.
//
// Authenticated: every request must carry a Supabase-issued OAuth 2.1 bearer
// token bound to this resource. Missing, malformed, expired, wrongly-audienced
// and wrongly-issued tokens all get 401 with an RFC 9728 `WWW-Authenticate`
// challenge pointing at the protected-resource metadata.
//
// The route owns wiring only; verification lives in lib/mcp/auth.ts and the
// composition in lib/mcp/handler.ts. Domain tools (seven read, seven
// write behind MCP_WRITE_ENABLED) query Supabase through the caller's own
// RLS-scoped client and are audited to kori_mcp_audit
// (docs/chatgpt-mcp-integration.md §6–§11).
//
// Known gap (2026-11-04): tokens come from Supabase's OAuth server, but
// sign-in moved to h-space-api, so no current user can complete the
// /oauth/consent flow — docs/SECOND_BRAIN_ARCHITECTURE.md §4.1 (repo root).
import { tryLoadMcpAuthConfig, type McpAuthConfig } from "@/lib/mcp/config"
import { SupabaseMcpTokenVerifier } from "@/lib/mcp/auth"
import { createAuthenticatedMcpHandler, type AuthenticatedMcpHandler } from "@/lib/mcp/handler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

// Built once per process on first use, then reused: the JWKS cache inside the
// verifier is the point of keeping it. It holds no per-user state — a fresh
// McpServer and a fresh AuthInfo are produced per request.
let cached: { config: McpAuthConfig; handler: AuthenticatedMcpHandler } | null = null

function resolveHandler(): { handler: AuthenticatedMcpHandler } | { error: string } {
  if (cached) return { handler: cached.handler }

  const resolved = tryLoadMcpAuthConfig()
  if ("error" in resolved) return resolved

  const { config } = resolved
  cached = {
    config,
    handler: createAuthenticatedMcpHandler(config, new SupabaseMcpTokenVerifier(config)),
  }
  return { handler: cached.handler }
}

async function serve(request: Request): Promise<Response> {
  const resolved = resolveHandler()
  // Fail closed: an unconfigured deployment serves nothing rather than
  // serving unauthenticated. The reason stays in the server logs.
  if ("error" in resolved) {
    console.error(`[mcp] refusing request: ${resolved.error}`)
    return Response.json(
      { error: "The MCP endpoint is not configured on this deployment." },
      { status: 503 },
    )
  }
  return resolved.handler.fetch(request)
}

export { serve as GET, serve as POST, serve as DELETE }
