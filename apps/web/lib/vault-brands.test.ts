import { describe, expect, it } from "vitest"

import { brandTone, resolveServiceBrand } from "./vault-brands"
import { DEMO_VAULT_ACCOUNTS } from "./vault-demo"

const title = (name: string, url?: string | null) => resolveServiceBrand(name, url)?.title ?? null

describe("resolveServiceBrand", () => {
  it.each([
    ["GitHub", "GitHub"],
    ["github", "GitHub"],
    ["Google", "Google"],
    ["Gmail", "Gmail"],
    ["Kakao", "KakaoTalk"],
    ["KakaoTalk", "KakaoTalk"],
    ["Kakao Talk", "KakaoTalk"],
    ["Naver", "Naver"],
    ["Notion", "Notion"],
    ["Vercel", "Vercel"],
    ["Twitter", "X"],
    ["X", "X"],
  ])("matches the whole name %s", (name, expected) => {
    expect(title(name)).toBe(expected)
  })

  it("matches a brand word inside a longer name, ignoring generic words", () => {
    expect(title("GitHub Secondary")).toBe("GitHub")
    expect(title("Apple Account")).toBe("Apple")
    expect(title("OpenAI Platform")).toBe("OpenAI")
    expect(title("Personal Account")).toBeNull()
  })

  it("does not match short words inside longer names", () => {
    // "x" alone is X, but not as a word in another name.
    expect(title("Box X Studio")).toBeNull()
    expect(title("Online Banking")).toBeNull()
  })

  it("falls back to the website's domain", () => {
    expect(title("My mail", "https://accounts.google.com/")).toBe("Google")
    expect(title("Work chat", "https://app.slack.com/")).toBe("Slack")
    expect(title("Unknown", "https://bank.example.com/")).toBeNull()
    expect(title("Unknown", "not a url")).toBeNull()
  })

  it.each([
    ["OpenAI Platform", "OpenAI", "color"],
    ["LinkedIn", "LinkedIn", "art"],
    ["Microsoft", "Microsoft", "art"],
    ["Microsoft Account", "Microsoft", "art"],
    ["PPC Bank", "PPC Bank", "color"],
    ["KB Bank", "KB Kookmin Bank", "color"],
    ["KB", "KB Kookmin Bank", "color"],
    ["KB Kookmin Bank", "KB Kookmin Bank", "color"],
    ["ABA", "ABA Bank", "color"],
    ["ABA Bank", "ABA Bank", "color"],
    ["Coupang", "Coupang", "color"],
    ["canva", "Canva", "color"],
    ["Huawei", "Huawei", "icon"],
    ["Hauwie", "Huawei", "icon"],
  ])("resolves %s → %s (%s)", (name, expected, kind) => {
    const brand = resolveServiceBrand(name)
    expect(brand?.title).toBe(expected)
    expect(brand?.kind).toBe(kind)
  })

  it("labels bank badges with their short name", () => {
    for (const [name, label] of [
      ["KB Bank", "KB"],
      ["ABA Bank", "ABA"],
      ["PPC Bank", "PPC"],
    ]) {
      const brand = resolveServiceBrand(name)
      expect(brand?.kind === "color" && brand.label).toBe(label)
    }
  })

  it("matches the banks by website domain", () => {
    expect(title("My bank", "https://www.ababank.com/")).toBe("ABA Bank")
    expect(title("My bank", "https://www.ppcbank.com.kh/")).toBe("PPC Bank")
    expect(title("My bank", "https://obank.kbstar.com/")).toBe("KB Kookmin Bank")
  })

  it.each([
    ["Bizplay", "Bizplay", "B"],
    ["Flow", "Flow", "F"],
    ["Kosign", "Kosign", "K"],
    ["KOSIGN", "Kosign", "K"],
    ["Privacy-i Agent", "Privacy-i", "Pi"],
    ["Privacy-i", "Privacy-i", "Pi"],
  ])("gives work tool %s a %s badge", (name, expected, label) => {
    const brand = resolveServiceBrand(name)
    expect(brand?.title).toBe(expected)
    expect(brand?.kind === "color" && brand.label).toBe(label)
  })

  it("matches work tools by domain too", () => {
    expect(title("Company expenses", "https://www.bizplay.co.kr/")).toBe("Bizplay")
    expect(title("Team chat", "https://flow.team/")).toBe("Flow")
  })

  it("does not match everyday-word aliases inside longer names", () => {
    expect(title("Money Flow")).toBeNull()
    expect(title("Work Drive")).toBeNull()
    expect(title("Flow")).toBe("Flow")
    expect(title("Google Drive")).toBe("Google Drive")
  })

  it("never matches a stray 2-letter word", () => {
    expect(title("Notebook kb guide")).toBeNull()
  })

  it("returns full logo data for bundled icons", () => {
    const brand = resolveServiceBrand("GitHub")
    expect(brand?.kind).toBe("icon")
    expect(brand && "path" in brand && brand.path.startsWith("M")).toBe(true)
    expect(brand?.kind === "icon" && brand.hex).toMatch(/^#[0-9A-F]{6}$/i)
  })

  it("resolves the real platforms in the demo data", () => {
    const unresolved = DEMO_VAULT_ACCOUNTS.filter(
      (a) => !resolveServiceBrand(a.serviceName, a.websiteUrl),
    ).map((a) => a.serviceName)
    // Fictional services keep the letter avatar.
    expect(unresolved.sort()).toEqual(["Example Bank", "Old Forum"])
  })
})

describe("brandTone", () => {
  it("keeps near-black brands readable in dark mode", () => {
    expect(brandTone("#181717")).toBe("ink") // GitHub
    expect(brandTone("#000000")).toBe("ink") // X, Notion
  })

  it("puts very light brands on a solid background", () => {
    expect(brandTone("#FFCD00")).toBe("solid") // Kakao
  })

  it("tints everything else", () => {
    expect(brandTone("#03C75A")).toBe("tint") // Naver
    expect(brandTone("#0A66C2")).toBe("tint") // LinkedIn
  })
})
