import { afterEach, describe, expect, it, vi } from "vitest"

import { HSPACE_API_URL, HSPACE_TOKEN_HEADER } from "@/lib/api/auth-http"
import { hspaceInboxSearch } from "./hspace-inbox"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("hspaceInboxSearch", () => {
  it("is unavailable without the caller's h-space-api token", () => {
    expect(hspaceInboxSearch(new Request("http://app/api/ai/memory/ask"))).toBeUndefined()
  })

  it("searches hspace-api as the caller and maps rows for memory retrieval", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: { code: 200, message: "Success" },
          data: [{ id: "i1", title: null, content: "Learn SQL indexes", itemType: "dev" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)
    const req = new Request("http://app/api/ai/memory/ask", {
      headers: { [HSPACE_TOKEN_HEADER]: "spring-token" },
    })

    const search = hspaceInboxSearch(req)
    await expect(search?.("sql indexes", 5)).resolves.toEqual([
      { id: "i1", title: null, content: "Learn SQL indexes", item_type: "dev" },
    ])

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${HSPACE_API_URL}/api/v1/inbox-items?q=sql+indexes&limit=5&status=all`)
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer spring-token")
  })
})
