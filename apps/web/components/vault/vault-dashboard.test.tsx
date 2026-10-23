/** @vitest-environment jsdom */

// H-Vault dashboard behaviour on the demo adapter (fictional data only).
// The real lib/api/vault demo adapter runs against jsdom's localStorage;
// Supabase is mocked out entirely so nothing can reach a live project.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => {
      throw new Error("Supabase must not be called in demo mode")
    },
  },
}))
vi.mock("@/lib/auth-store", () => ({
  getUserId: () => "user-a",
  requireUserId: () => "user-a",
}))
vi.mock("@/lib/feature-flags", () => ({ isVaultLiveEnabled: () => false }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { VaultDashboard } = await import("./VaultDashboard")
const { MyAppsSection } = await import("@/components/home/MyAppsSection")
const { DEMO_VAULT_ACCOUNTS } = await import("@/lib/vault-demo")
const { VAULT_PASSWORD_NOTICE } = await import("@/lib/vault")
const { encryptVaultPassword, isVaultEnvelope, unlockVault } = await import("@/lib/vault-crypto")
const { lockVault } = await import("@/lib/vault-session")

// Fictional values for the password flow tests.
const SAMPLE = "not-a-real-password-123"
const MASTER = "a long fictional master password"
const clipboardWrite = vi.fn(async (value: string) => void value)

beforeAll(() => {
  // Radix primitives rely on these in jsdom.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView ??= () => {}
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: clipboardWrite },
    configurable: true,
  })
})

beforeEach(() => {
  window.localStorage.clear()
  clipboardWrite.mockClear()
  // The unlocked key is module memory; never let one test inherit another's.
  lockVault()
})
afterEach(cleanup)

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <VaultDashboard />
    </QueryClientProvider>,
  )
}

async function ready() {
  await screen.findAllByRole("article")
}

describe("H-Vault dashboard", () => {
  it("shows the header, encryption notice, demo banner, and overview", async () => {
    renderDashboard()
    await ready()
    expect(screen.queryByRole("heading", { level: 2, name: "H-Vault" })).toBeNull()
    expect(screen.getByText(VAULT_PASSWORD_NOTICE)).toBeTruthy()
    expect(screen.queryByText(/Bitwarden/)).toBeNull()
    expect(screen.getByText(/Demo mode\./)).toBeTruthy()
    const overview = screen.getByRole("region", { name: "Overview" })
    expect(within(overview).getByText(String(DEMO_VAULT_ACCOUNTS.length))).toBeTruthy()
    expect(screen.getAllByRole("article")).toHaveLength(DEMO_VAULT_ACCOUNTS.length)
  })

  it("searches case-insensitively and shows an empty state with recovery", async () => {
    renderDashboard()
    await ready()
    const search = screen.getByRole("searchbox", { name: "Search accounts" })
    fireEvent.change(search, { target: { value: "GITHUB" } })
    // Vercel's fictional account also matches because it uses GitHub sign-in.
    expect(screen.getAllByRole("article")).toHaveLength(3)

    fireEvent.change(search, { target: { value: "DEMO.LEARNING@" } })
    expect(screen.getAllByRole("article")).toHaveLength(1)

    fireEvent.change(search, { target: { value: "zzz-nothing" } })
    expect(screen.queryAllByRole("article")).toHaveLength(0)
    expect(screen.getByText(/No accounts match/)).toBeTruthy()
    fireEvent.click(screen.getAllByRole("button", { name: "Clear filters" })[0])
    expect(screen.getAllByRole("article")).toHaveLength(DEMO_VAULT_ACCOUNTS.length)
  })

  it("filters favorites", async () => {
    renderDashboard()
    await ready()
    fireEvent.click(screen.getByRole("button", { name: "Favorites", pressed: false }))
    expect(screen.getAllByRole("article")).toHaveLength(
      DEMO_VAULT_ACCOUNTS.filter((a) => a.isFavorite).length,
    )
  })

  it("toggles a favorite", async () => {
    renderDashboard()
    await ready()
    const card = screen.getByRole("article", { name: "Vercel" })
    fireEvent.click(within(card).getByRole("button", { name: "Add Vercel to favorites" }))
    await waitFor(() =>
      expect(
        within(screen.getByRole("article", { name: "Vercel" })).getByRole("button", {
          name: "Remove Vercel from favorites",
        }),
      ).toBeTruthy(),
    )
  })

  it("adds an account through the validated form", async () => {
    renderDashboard()
    await ready()
    fireEvent.click(screen.getAllByRole("button", { name: "Add account" })[0])
    const dialog = await screen.findByRole("dialog")

    // Required field.
    fireEvent.click(within(dialog).getByRole("button", { name: "Add account" }))
    expect(await within(dialog).findByText("Service name is required.")).toBeTruthy()

    fireEvent.change(within(dialog).getByLabelText("Service name"), { target: { value: "Figma" } })
    fireEvent.change(within(dialog).getByLabelText(/^Website/), {
      target: { value: "javascript:alert(1)" },
    })
    fireEvent.click(within(dialog).getByRole("button", { name: "Add account" }))
    expect(await within(dialog).findByText(/secure https:\/\/ link/)).toBeTruthy()

    fireEvent.change(within(dialog).getByLabelText(/^Website/), {
      target: { value: "https://www.figma.com/login" },
    })
    fireEvent.change(within(dialog).getByLabelText(/^Login email or username/), {
      target: { value: "demo.designer@example.com" },
    })
    fireEvent.click(within(dialog).getByRole("button", { name: "Add account" }))

    expect(await screen.findByRole("article", { name: "Figma" })).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("confirms before deleting", async () => {
    renderDashboard()
    await ready()
    const card = screen.getByRole("article", { name: "Old Forum" })
    fireEvent.pointerDown(
      within(card).getByRole("button", { name: "More actions for Old Forum" }),
      {
        button: 0,
        ctrlKey: false,
      },
    )
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }))

    const confirm = await screen.findByRole("alertdialog")
    expect(within(confirm).getByText(/Delete this account entry/)).toBeTruthy()
    fireEvent.click(within(confirm).getByRole("button", { name: "Cancel" }))
    expect(screen.getByRole("article", { name: "Old Forum" })).toBeTruthy()

    fireEvent.pointerDown(
      within(screen.getByRole("article", { name: "Old Forum" })).getByRole("button", {
        name: "More actions for Old Forum",
      }),
      { button: 0, ctrlKey: false },
    )
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }))
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" }),
    )
    await waitFor(() => expect(screen.queryByRole("article", { name: "Old Forum" })).toBeNull())
  })

  it("shows each platform's bundled logo, and a letter for unknown services", async () => {
    const { container } = renderDashboard()
    await ready()
    const github = screen.getAllByRole("article", { name: /GitHub/ })[0]
    expect(github.querySelector('[data-brand="GitHub"] svg path')).toBeTruthy()
    const kakao = screen.getByRole("article", { name: "Kakao" })
    expect(kakao.querySelector('[data-brand="KakaoTalk"]')).toBeTruthy()
    const bank = screen.getByRole("article", { name: "Example Bank (Everyday)" })
    expect(bank.querySelector("[data-brand]")).toBeNull()
    expect(bank.querySelector('[aria-hidden="true"]')?.textContent).toBe("E")
    // Logos are inline SVG — no image requests to third parties.
    expect(container.querySelectorAll("img")).toHaveLength(0)
  })

  it("only links website URLs that are https", async () => {
    renderDashboard()
    await ready()
    for (const link of screen.getAllByRole("link", { name: /Open website/ })) {
      expect(link.getAttribute("href")).toMatch(/^https:\/\//)
    }
  })

  it("encrypts a new password in the browser: only ciphertext is stored", async () => {
    renderDashboard()
    await ready()
    fireEvent.click(screen.getAllByRole("button", { name: "Add account" })[0])
    const dialog = await screen.findByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText("Service name"), { target: { value: "Figma" } })
    fireEvent.change(within(dialog).getByLabelText(/^Password/), { target: { value: SAMPLE } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Add account" }))

    // First time: create a master password (typed twice, min length).
    expect(await screen.findByRole("heading", { name: /Create a master password/ })).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Master password"), { target: { value: "short" } })
    fireEvent.change(screen.getByLabelText("Confirm master password"), {
      target: { value: "short" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create and unlock" }))
    expect(await screen.findByText(/at least 12 characters/)).toBeTruthy()

    fireEvent.change(screen.getByLabelText("Master password"), { target: { value: MASTER } })
    fireEvent.change(screen.getByLabelText("Confirm master password"), {
      target: { value: MASTER },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create and unlock" }))

    const card = await screen.findByRole("article", { name: "Figma" }, { timeout: 20_000 })
    expect(within(card).getByRole("button", { name: "Copy password for Figma" })).toBeTruthy()
    expect(card.textContent).not.toContain(SAMPLE)

    const stored = window.localStorage.getItem("hengo-vault-demo-accounts") ?? ""
    expect(stored).not.toContain(SAMPLE)
    expect(stored).not.toContain(MASTER)
    const figma = (
      JSON.parse(stored) as Array<{ serviceName: string; passwordCiphertext: string }>
    ).find((a) => a.serviceName === "Figma")!
    expect(isVaultEnvelope(figma.passwordCiphertext)).toBe(true)
    expect(Object.keys(figma)).not.toContain("password")
  }, 30_000)

  it("asks for the master password to copy, rejects a wrong one, and copies once unlocked", async () => {
    const key = await unlockVault(MASTER, null)
    const envelope = await encryptVaultPassword(SAMPLE, key)
    window.localStorage.setItem(
      "hengo-vault-demo-accounts",
      JSON.stringify([{ ...DEMO_VAULT_ACCOUNTS[0], passwordCiphertext: envelope }]),
    )
    renderDashboard()
    await ready()

    fireEvent.click(screen.getByRole("button", { name: /Copy password for GitHub/ }))
    expect(await screen.findByRole("heading", { name: /Unlock passwords/ })).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Master password"), {
      target: { value: "the wrong master password" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }))
    expect(await screen.findByText("Wrong master password.", {}, { timeout: 20_000 })).toBeTruthy()
    expect(clipboardWrite).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText("Master password"), { target: { value: MASTER } })
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }))
    await waitFor(() => expect(clipboardWrite).toHaveBeenCalledWith(SAMPLE), { timeout: 20_000 })

    // Unlocked now: Lock is offered, and locking forgets the key.
    fireEvent.click(await screen.findByRole("button", { name: "Lock passwords" }))
    await waitFor(() => expect(screen.queryByRole("button", { name: "Lock passwords" })).toBeNull())
  }, 40_000)

  it("still has no PIN, recovery-code, token, or notes field", async () => {
    renderDashboard()
    await ready()
    fireEvent.click(screen.getAllByRole("button", { name: "Add account" })[0])
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).queryByLabelText(/pin|recovery|secret|token|api key|notes/i)).toBeNull()
    // The single password input is the encrypted Password field.
    expect(dialog.querySelectorAll('input[type="password"]')).toHaveLength(1)
    expect(
      within(dialog)
        .getByLabelText(/^Password/)
        .getAttribute("autocomplete"),
    ).toBe("new-password")
  })
})

describe("H-Vault CSV import", () => {
  it("imports reviewed rows locally, encrypts passwords, and never keeps notes", async () => {
    renderDashboard()
    await ready()
    fireEvent.click(screen.getByRole("button", { name: "Import CSV" }))
    const dialog = await screen.findByRole("dialog")

    const csv = [
      "Service,Username,Category,Status,Notes,Password",
      `Figma,demo.designer@example.com,Productivity,Active,fictional private note,${SAMPLE}`,
      "Old Site,demo-old,Other,Archived,,",
      // Already in the demo set (GitHub · demo-dev) → flagged and unselected.
      "GitHub,demo-dev,Development,Active,,",
    ].join("\n")
    const file = new File([csv], "notion-export.csv", { type: "text/csv" })
    fireEvent.change(within(dialog).getByLabelText("Choose a CSV file"), {
      target: { files: [file] },
    })

    const list = await within(dialog).findByRole("list", { name: "Rows to import" })
    expect(within(dialog).getByText("Not imported: Notes")).toBeTruthy()
    expect(within(list).getByRole("checkbox", { name: /Import GitHub/ })).toHaveProperty(
      "checked",
      false,
    )
    expect(dialog.textContent).not.toContain(SAMPLE)

    fireEvent.click(within(dialog).getByRole("button", { name: "Import 2 accounts" }))

    // A password is included, so the master password is created first.
    fireEvent.change(await screen.findByLabelText("Master password"), {
      target: { value: MASTER },
    })
    fireEvent.change(screen.getByLabelText("Confirm master password"), {
      target: { value: MASTER },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create and unlock" }))

    expect(
      await screen.findByText(/Imported 2 accounts, tagged #imported/, {}, { timeout: 20_000 }),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Done" }))

    expect(await screen.findByRole("article", { name: "Figma" })).toBeTruthy()
    expect(screen.getByRole("article", { name: "Old Site" })).toBeTruthy()
    expect(screen.getAllByRole("article", { name: /GitHub/ })).toHaveLength(2) // not duplicated

    const stored = window.localStorage.getItem("hengo-vault-demo-accounts") ?? ""
    expect(stored).not.toContain(SAMPLE)
    expect(stored).not.toContain(MASTER)
    expect(stored).not.toContain("fictional private note")
    const figma = (
      JSON.parse(stored) as Array<{
        serviceName: string
        passwordCiphertext: string
        tags: string[]
      }>
    ).find((a) => a.serviceName === "Figma")!
    expect(isVaultEnvelope(figma.passwordCiphertext)).toBe(true)
    expect(figma.tags).toEqual(["imported"])
  }, 40_000)

  it("explains a file it can't use", async () => {
    renderDashboard()
    await ready()
    fireEvent.click(screen.getByRole("button", { name: "Import CSV" }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText("Choose a CSV file"), {
      target: { files: [new File(["Service,Username\n"], "empty.csv", { type: "text/csv" })] },
    })
    expect(await within(dialog).findByRole("alert")).toHaveProperty(
      "textContent",
      "The file has no data rows.",
    )
  })
})

describe("public My Apps card", () => {
  it("shows a generic H-Vault card with no account data", () => {
    window.localStorage.setItem(
      "hengo-vault-demo-accounts",
      JSON.stringify([
        { ...DEMO_VAULT_ACCOUNTS[0], loginIdentifier: "private.person@example.com" },
      ]),
    )
    const { container } = render(<MyAppsSection />)
    const card = screen.getByRole("heading", { name: "H-Vault" }).closest("article")!
    expect(
      within(card)
        .getByRole("link", { name: /Open app/ })
        .getAttribute("href"),
    ).toBe("/vault")
    const text = container.textContent ?? ""
    expect(text).not.toContain("private.person@example.com")
    expect(text).not.toMatch(/@example\.(com|org)/)
    for (const account of DEMO_VAULT_ACCOUNTS) {
      if (account.loginIdentifier) expect(text).not.toContain(account.loginIdentifier)
    }
  })
})
