import { describe, expect, it } from "vitest"

import {
  buildImportRows,
  MAX_IMPORT_ROWS,
  mapCategory,
  mapStatus,
  parseCsv,
  VaultImportError,
} from "./vault-import"
import { VAULT_CATEGORIES, type VaultAccount } from "./vault"

// Fictional rows only, shaped like a Notion database CSV export.
const NOTION_CSV = [
  "﻿Service,Username,Category,Status,Last Updated,Next Rotation,Notes,Password",
  "GitHub,demo-dev,Development,Active,2026-10-01,2027-01-01,secret note,not-a-real-pw-1",
  'Google,demo.person@example.com,Email,Needs rotation,,,"multi\nline, note",not-a-real-pw-2',
  'Example Bank,"demo, saver",Finance,Archived,,,,"pw with ""quotes"""',
  ",orphan-user,Other,Active,,,,",
].join("\r\n")

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, commas and newlines in quotes, CRLF, and a BOM", () => {
    const rows = parseCsv(NOTION_CSV)
    expect(rows[0][0]).toBe("Service")
    expect(rows[2][6]).toBe("multi\nline, note")
    expect(rows[3][1]).toBe("demo, saver")
    expect(rows[3][7]).toBe('pw with "quotes"')
    expect(rows).toHaveLength(5)
  })

  it("drops blank lines", () => {
    expect(parseCsv("a,b\n\n1,2\n\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ])
  })
})

describe("buildImportRows", () => {
  it("maps Notion columns and ignores Notes, Last Updated, and Next Rotation", () => {
    const result = buildImportRows(NOTION_CSV)
    expect(result.columns).toMatchObject({
      service: "Service",
      username: "Username",
      category: "Category",
      status: "Status",
      password: "Password",
    })
    expect(result.ignoredColumns).toEqual(["Last Updated", "Next Rotation", "Notes"])
    expect(JSON.stringify(result.rows)).not.toContain("secret note")
    expect(JSON.stringify(result.rows)).not.toContain("multi")
  })

  it("builds reviewable rows with mapped category and status", () => {
    const { rows, skipped } = buildImportRows(NOTION_CSV)
    expect(skipped).toBe(1)
    expect(rows.map((r) => [r.serviceName, r.loginIdentifier, r.category, r.status])).toEqual([
      ["GitHub", "demo-dev", "development", "active"],
      ["Google", "demo.person@example.com", "email", "needs_review"],
      ["Example Bank", "demo, saver", "finance", "inactive"],
    ])
    expect(rows[2].password).toBe('pw with "quotes"')
    expect(rows.every((r) => r.include)).toBe(true)
  })

  it("flags duplicates against existing accounts and within the file, unselected", () => {
    const existing = [{ serviceName: "github", loginIdentifier: "DEMO-DEV" } as VaultAccount]
    const csv = "Service,Username\nGitHub,demo-dev\nNotion,a\nnotion,A"
    const { rows } = buildImportRows(csv, existing)
    expect(rows.map((r) => [r.duplicate, r.include])).toEqual([
      [true, false],
      [false, true],
      [true, false],
    ])
  })

  it("keeps only safe https websites, with a warning otherwise", () => {
    const { rows } = buildImportRows(
      "Name,URL\nA,github.com/login\nB,javascript:alert(1)\nC,http://example.com",
    )
    expect(rows.map((r) => r.websiteUrl)).toEqual(["https://github.com/login", null, null])
    expect(rows[1].warnings[0]).toMatch(/https/)
  })

  it("falls back to the first column for the service name", () => {
    const { rows, columns } = buildImportRows("Platform Title,Email\nKakao,demo@example.com")
    expect(columns.service).toBe("Platform Title")
    expect(rows[0]).toMatchObject({ serviceName: "Kakao", loginIdentifier: "demo@example.com" })
  })

  it("rejects empty files, files without service names, and too many rows", () => {
    expect(() => buildImportRows("Service,Username")).toThrow(VaultImportError)
    expect(() => buildImportRows("Service,Username\n,a")).toThrow(/No rows/)
    const big = ["Service", ...Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `S${i}`)]
    expect(() => buildImportRows(big.join("\n"))).toThrow(/at most/)
  })
})

describe("mapping", () => {
  it.each([
    ["Email", "email"],
    ["Gmail accounts", "email"],
    ["Development", "development"],
    ["Dev", "development"],
    ["AI Tools", "ai-tools"],
    ["Social", "social"],
    ["Bank", "finance"],
    ["Shopping", "shopping"],
    ["Productivity", "productivity"],
    ["Korea & Local Services", "korea-local"],
    ["Devices", "devices"],
    ["Other", "other"],
    ["", "other"],
    ["Something unknown", "other"],
  ])("category %s → %s", (raw, expected) => {
    expect(mapCategory(raw)).toBe(expected)
  })

  it("maps every built-in label to itself", () => {
    for (const c of VAULT_CATEGORIES) expect(mapCategory(c.label)).toBe(c.id)
  })

  it.each([
    ["Active", "active"],
    ["", "active"],
    ["Needs review", "needs_review"],
    ["Rotate soon", "needs_review"],
    ["Archived", "inactive"],
    ["Deleted", "inactive"],
  ])("status %s → %s", (raw, expected) => {
    expect(mapStatus(raw)).toBe(expected)
  })
})
