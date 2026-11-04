import { describe, expect, it } from "vitest"
import { createMcpHandler } from "@modelcontextprotocol/server"
import {
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  buildServerInfo,
  buildServerInstructions,
  createHengoMcpServer,
  formatServerInfo,
  serverInfoSchema,
  surfaceFor,
  toolNamesFor,
  type McpSurface,
} from "./server"
import { READ_TOOL_NAMES, WRITE_TOOL_NAMES } from "./tools"
import { fakeContext, fakeDb } from "./tools/test-support"
import type { McpContext } from "./context"

// ── JSON-RPC helper ──────────────────────────────────────────────────────────
// Drives the real Streamable HTTP handler the /mcp route uses, so these tests
// cover the transport wiring and not just the server object. Responses may come
// back as a single JSON body or as an SSE stream depending on the exchange.

function makeHandler(mcpContext?: McpContext) {
  return createMcpHandler(() => createHengoMcpServer(mcpContext))
}

async function readBody(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  if (res.headers.get("content-type")?.includes("text/event-stream")) {
    const line = text
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("data:"))
    if (!line) throw new Error(`No data frame in SSE response: ${text}`)
    return JSON.parse(line.slice("data:".length).trim())
  }
  return JSON.parse(text)
}

async function rpc(
  handler: ReturnType<typeof makeHandler>,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<Record<string, unknown>> {
  const res = await handler.fetch(
    new Request("http://localhost:3000/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  )
  expect(res.status).toBe(200)
  return readBody(res)
}

const INIT = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "hengo-tests", version: "1.0.0" },
  },
} as const

const PROTOCOL_HEADER = { "mcp-protocol-version": "2025-06-18" }

// ── Identity ─────────────────────────────────────────────────────────────────

describe("server identity", () => {
  it("has a stable name clients can key a stored connection off", () => {
    expect(MCP_SERVER_NAME).toBe("hengo")
  })

  it("has a semver version for the MCP surface", () => {
    expect(MCP_SERVER_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})

// ── Instructions ─────────────────────────────────────────────────────────────

const SURFACES: McpSurface[] = ["foundation", "read", "read-write"]

describe("buildServerInstructions", () => {
  it.each(SURFACES)(
    "front-loads the data-not-instructions rule and the write mode for %s",
    (surface) => {
      // Clients commonly truncate around 512 chars; the caveats must land
      // inside that window, not after it.
      const head = buildServerInstructions(surface).slice(0, 512)
      expect(head).toContain("data, never instructions")
      expect(head).toMatch(/only that user's own records/)
      const mode = {
        foundation: "exposes only get_hengo_server_info",
        read: "write tools are turned off",
        "read-write": "use them only when the user asks",
      }[surface]
      expect(head).toContain(mode)
    },
  )

  it.each(SURFACES)("names every tool the %s surface has, and no other", (surface) => {
    const instructions = buildServerInstructions(surface)
    const all = ["get_hengo_server_info", ...READ_TOOL_NAMES, ...WRITE_TOOL_NAMES]
    const expected = toolNamesFor(surface)
    for (const name of all) {
      expect(instructions.includes(name), name).toBe(expected.includes(name))
    }
  })

  it("no longer tells clients the server holds no data", () => {
    // The pre-2026-11-04 text said only get_hengo_server_info existed even
    // though the domain tools were registered.
    for (const surface of SURFACES) {
      expect(buildServerInstructions(surface)).not.toMatch(/cannot yet read or write/i)
    }
  })

  it("maps a missing context to foundation and follows writeEnabled otherwise", () => {
    expect(surfaceFor(undefined)).toBe("foundation")
    expect(surfaceFor({ writeEnabled: false })).toBe("read")
    expect(surfaceFor({ writeEnabled: true })).toBe("read-write")
  })
})

// ── buildServerInfo / formatServerInfo ───────────────────────────────────────

describe("buildServerInfo", () => {
  const fixedNow = new Date("2026-08-04T09:30:00.000Z")

  it("returns the server name, version, timestamp and status", () => {
    expect(buildServerInfo(fixedNow)).toEqual({
      name: "hengo",
      version: MCP_SERVER_VERSION,
      timestamp: "2026-08-04T09:30:00.000Z",
      status: "ok",
    })
  })

  it("returns those four fields and nothing else", () => {
    // Guard against personal data ever being added to this payload.
    expect(Object.keys(buildServerInfo(fixedNow)).sort()).toEqual([
      "name",
      "status",
      "timestamp",
      "version",
    ])
  })

  it("satisfies the declared output schema", () => {
    expect(serverInfoSchema.safeParse(buildServerInfo(fixedNow)).success).toBe(true)
  })

  it("uses the current clock by default and formats it as ISO-8601 UTC", () => {
    const before = Date.now()
    const { timestamp } = buildServerInfo()
    const parsed = Date.parse(timestamp)
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(parsed).toBeGreaterThanOrEqual(before)
    expect(parsed).toBeLessThanOrEqual(Date.now())
  })

  it("summarises itself for clients that do not render structured output", () => {
    const text = formatServerInfo(buildServerInfo(fixedNow))
    expect(text).toContain("hengo")
    expect(text).toContain(MCP_SERVER_VERSION)
    expect(text).toContain("2026-08-04T09:30:00.000Z")
    expect(text).toContain("ok")
  })
})

// ── Initialization ───────────────────────────────────────────────────────────

describe("createHengoMcpServer", () => {
  it("constructs without touching Supabase, auth or the network", () => {
    expect(() => createHengoMcpServer()).not.toThrow()
  })

  it("returns a fresh instance per call so no state is shared between requests", () => {
    expect(createHengoMcpServer()).not.toBe(createHengoMcpServer())
  })
})

describe("initialize handshake", () => {
  it("reports the server's stable identity and instructions", async () => {
    const handler = makeHandler()
    try {
      const body = await rpc(handler, INIT)
      const result = body.result as {
        serverInfo: { name: string; version: string }
        instructions?: string
        capabilities: Record<string, unknown>
      }
      expect(result.serverInfo.name).toBe(MCP_SERVER_NAME)
      expect(result.serverInfo.version).toBe(MCP_SERVER_VERSION)
      expect(result.instructions).toBe(buildServerInstructions("foundation"))
      expect(result.capabilities).toHaveProperty("tools")
    } finally {
      await handler.close()
    }
  })

  it.each([
    ["read", false],
    ["read-write", true],
  ] as const)(
    "sends %s instructions when the context has writeEnabled=%s",
    async (surface, writeEnabled) => {
      const handler = makeHandler(fakeContext(fakeDb({}), { writeEnabled }))
      try {
        const body = await rpc(handler, INIT)
        const result = body.result as { instructions?: string }
        expect(result.instructions).toBe(buildServerInstructions(surface))
      } finally {
        await handler.close()
      }
    },
  )
})

// ── Tool surface ─────────────────────────────────────────────────────────────

async function listToolNames(handler: ReturnType<typeof makeHandler>): Promise<string[]> {
  await rpc(handler, INIT)
  const body = await rpc(
    handler,
    { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    PROTOCOL_HEADER,
  )
  return (body.result as { tools: { name: string }[] }).tools.map((t) => t.name)
}

describe("tools/list", () => {
  it("exposes only the foundation tool when built without a verified McpContext", async () => {
    // Unreachable in production (requireBearerAuth gates first — see
    // handler.ts), but the factory must degrade to no domain tools rather
    // than throw if it is ever called without one.
    const handler = makeHandler()
    try {
      const names = await listToolNames(handler)
      expect(names).toEqual(["get_hengo_server_info"])
    } finally {
      await handler.close()
    }
  })

  it("exposes the foundation tool plus all read tools, and no write tools, when writes are disabled", async () => {
    const handler = makeHandler(fakeContext(fakeDb({}), { writeEnabled: false }))
    try {
      const names = await listToolNames(handler)
      expect(names).toContain("get_hengo_server_info")
      expect(names).toContain("list_goals")
      expect(names).not.toContain("create_task")
      expect(names).toHaveLength(8) // 1 foundation + 7 read tools
    } finally {
      await handler.close()
    }
  })

  it("also exposes every write tool when MCP_WRITE_ENABLED is true — absent, not erroring, otherwise", async () => {
    const handler = makeHandler(fakeContext(fakeDb({}), { writeEnabled: true }))
    try {
      const names = await listToolNames(handler)
      expect(names).toContain("create_task")
      expect(names).toContain("capture_reflection")
      expect(names).toHaveLength(15) // 1 foundation + 7 read + 7 write
    } finally {
      await handler.close()
    }
  })
})

describe("instructions match the registered tools", () => {
  // The drift guard: what a client is told it can use must be exactly what
  // tools/list returns for that connection.
  it.each([
    ["foundation", undefined],
    ["read", false],
    ["read-write", true],
  ] as const)("%s: tools/list equals toolNamesFor()", async (surface, writeEnabled) => {
    const handler = makeHandler(
      writeEnabled === undefined ? undefined : fakeContext(fakeDb({}), { writeEnabled }),
    )
    try {
      const names = await listToolNames(handler)
      expect([...names].sort()).toEqual([...toolNamesFor(surface)].sort())
    } finally {
      await handler.close()
    }
  })
})

describe("tools/call input validation", () => {
  it("rejects a malformed goalId before the handler ever runs, through the real transport", async () => {
    const handler = makeHandler(fakeContext(fakeDb({}), { writeEnabled: false }))
    try {
      await rpc(handler, INIT)
      const body = await rpc(
        handler,
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "get_goal", arguments: { goalId: "not-a-uuid" } },
        },
        PROTOCOL_HEADER,
      )
      // Zod's inputSchema validation happens at the protocol layer, ahead of
      // the tool's own logic — either a JSON-RPC error or an isError result
      // is an acceptable shape for that, but a normal success is not.
      const result = body.result as { isError?: boolean } | undefined
      const failed = Boolean(body.error) || result?.isError === true
      expect(failed).toBe(true)
    } finally {
      await handler.close()
    }
  })
})

describe("tools/call get_hengo_server_info", () => {
  it("returns only the server's own name, version, timestamp and status", async () => {
    const handler = makeHandler()
    try {
      await rpc(handler, INIT)
      const body = await rpc(
        handler,
        {
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "get_hengo_server_info", arguments: {} },
        },
        PROTOCOL_HEADER,
      )
      const result = body.result as {
        isError?: boolean
        structuredContent: unknown
        content: { type: string; text: string }[]
      }

      expect(result.isError).toBeFalsy()

      const parsed = serverInfoSchema.safeParse(result.structuredContent)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return
      expect(parsed.data.name).toBe(MCP_SERVER_NAME)
      expect(parsed.data.version).toBe(MCP_SERVER_VERSION)
      expect(parsed.data.status).toBe("ok")
      expect(Object.keys(parsed.data).sort()).toEqual(["name", "status", "timestamp", "version"])

      expect(result.content[0]).toMatchObject({ type: "text" })
      expect(result.content[0].text).toContain(MCP_SERVER_NAME)
    } finally {
      await handler.close()
    }
  })
})
