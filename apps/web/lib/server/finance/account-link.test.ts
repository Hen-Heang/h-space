import { describe, expect, it } from "vitest"
import { parseFinanceAccountLinks, resolveLuyraUserId } from "./account-link"

// Synthetic ids only.
const H1 = "11111111-1111-4111-8111-111111111111"
const L1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const H2 = "22222222-2222-4222-8222-222222222222"
const L2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

describe("parseFinanceAccountLinks", () => {
  it("parses a single link", () => {
    const links = parseFinanceAccountLinks(`${H1}=${L1}`)
    expect(links && resolveLuyraUserId(links, H1)).toBe(L1)
  })

  it("parses several links and tolerates whitespace", () => {
    const links = parseFinanceAccountLinks(` ${H1} = ${L1} , ${H2}=${L2} `)
    expect(links?.size).toBe(2)
    expect(links && resolveLuyraUserId(links, H2)).toBe(L2)
  })

  it("matches ids case-insensitively", () => {
    const links = parseFinanceAccountLinks(`${H1.toUpperCase()}=${L1.toUpperCase()}`)
    expect(links && resolveLuyraUserId(links, H1)).toBe(L1)
  })

  it.each([
    ["missing", undefined],
    ["null", null],
    ["empty", ""],
    ["blank", "   "],
  ])("returns null when %s", (_label, raw) => {
    expect(parseFinanceAccountLinks(raw)).toBeNull()
  })

  it.each([
    ["no separator", `${H1}${L1}`],
    ["too many separators", `${H1}=${L1}=${L2}`],
    ["non-uuid h-space id", `user-1=${L1}`],
    ["non-uuid luyra id", `${H1}=someone@example.com`],
    ["empty side", `${H1}=`],
    ["trailing comma", `${H1}=${L1},`],
    ["duplicate h-space id", `${H1}=${L1},${H1}=${L2}`],
  ])("fails closed on a malformed entry (%s)", (_label, raw) => {
    expect(parseFinanceAccountLinks(raw)).toBeNull()
  })
})

describe("resolveLuyraUserId", () => {
  it("returns null for an H-Space user with no link", () => {
    const links = parseFinanceAccountLinks(`${H1}=${L1}`)!
    expect(resolveLuyraUserId(links, H2)).toBeNull()
  })

  it("never resolves a Luyra id passed as an H-Space id", () => {
    const links = parseFinanceAccountLinks(`${H1}=${L1}`)!
    expect(resolveLuyraUserId(links, L1)).toBeNull()
  })
})
