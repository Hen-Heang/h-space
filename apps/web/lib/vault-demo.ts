import type { VaultAccount } from "@/lib/vault"

// Fictional sample accounts for H-Vault's demo adapter (lib/api/vault.ts) and
// tests. Every identifier uses the reserved `example.com` / `example.org`
// domains or an obviously made-up handle — never a real account. There is,
// by design, nothing secret here to leak: H-Vault rows have no secret fields.

const day = (offset: number) =>
  new Date(Date.UTC(2026, 9, 20, 9, 0, 0) - offset * 86_400_000).toISOString()

function account(
  partial: Omit<
    VaultAccount,
    | "createdAt"
    | "updatedAt"
    | "tags"
    | "isFavorite"
    | "status"
    | "loginMethod"
    | "passwordCiphertext"
  > &
    Partial<Pick<VaultAccount, "tags" | "isFavorite" | "status" | "loginMethod">> & {
      created: number
      updated: number
    },
): VaultAccount {
  const { created, updated, ...rest } = partial
  return {
    tags: [],
    isFavorite: false,
    status: "active",
    loginMethod: "password",
    passwordCiphertext: null,
    ...rest,
    createdAt: day(created),
    updatedAt: day(updated),
  }
}

export const DEMO_VAULT_ACCOUNTS: VaultAccount[] = [
  account({
    id: "demo-github-personal",
    serviceName: "GitHub",
    accountLabel: "Personal",
    loginIdentifier: "demo-dev",
    websiteUrl: "https://github.com/login",
    category: "development",
    tags: ["code", "portfolio"],
    isFavorite: true,
    created: 60,
    updated: 1,
  }),
  account({
    id: "demo-github-secondary",
    serviceName: "GitHub",
    accountLabel: "Secondary",
    loginIdentifier: "demo-dev-lab",
    websiteUrl: "https://github.com/login",
    category: "development",
    tags: ["experiments"],
    created: 40,
    updated: 12,
  }),
  account({
    id: "demo-google-personal",
    serviceName: "Google",
    accountLabel: "Personal",
    loginIdentifier: "demo.person@example.com",
    websiteUrl: "https://accounts.google.com/",
    category: "email",
    isFavorite: true,
    created: 90,
    updated: 3,
  }),
  account({
    id: "demo-google-learning",
    serviceName: "Google",
    accountLabel: "Learning",
    loginIdentifier: "demo.learning@example.com",
    websiteUrl: "https://accounts.google.com/",
    category: "email",
    tags: ["study"],
    created: 30,
    updated: 20,
  }),
  account({
    id: "demo-openai",
    serviceName: "OpenAI Platform",
    accountLabel: null,
    loginIdentifier: "demo.person@example.com",
    websiteUrl: "https://platform.openai.com/login",
    category: "ai-tools",
    loginMethod: "google",
    status: "needs_review",
    created: 25,
    updated: 9,
  }),
  account({
    id: "demo-vercel",
    serviceName: "Vercel",
    accountLabel: null,
    loginIdentifier: "demo-dev",
    websiteUrl: "https://vercel.com/login",
    category: "development",
    loginMethod: "github",
    tags: ["deploy"],
    created: 50,
    updated: 6,
  }),
  account({
    id: "demo-notion",
    serviceName: "Notion",
    accountLabel: "Workspace",
    loginIdentifier: "demo.person@example.com",
    websiteUrl: "https://www.notion.so/login",
    category: "productivity",
    loginMethod: "google",
    created: 70,
    updated: 15,
  }),
  account({
    id: "demo-linkedin",
    serviceName: "LinkedIn",
    accountLabel: null,
    loginIdentifier: "demo.person@example.com",
    websiteUrl: "https://www.linkedin.com/login",
    category: "social",
    created: 80,
    updated: 33,
  }),
  account({
    id: "demo-bank",
    serviceName: "Example Bank",
    accountLabel: "Everyday",
    loginIdentifier: "demo-saver",
    websiteUrl: "https://bank.example.com/",
    category: "finance",
    status: "needs_review",
    created: 100,
    updated: 45,
  }),
  account({
    id: "demo-coupang",
    serviceName: "Coupang",
    accountLabel: null,
    loginIdentifier: "demo.shopper@example.org",
    websiteUrl: "https://login.coupang.com/",
    category: "shopping",
    created: 35,
    updated: 28,
  }),
  account({
    id: "demo-kakao",
    serviceName: "Kakao",
    accountLabel: null,
    loginIdentifier: "demo.person@example.com",
    websiteUrl: "https://accounts.kakao.com/",
    category: "korea-local",
    tags: ["messenger"],
    isFavorite: true,
    created: 120,
    updated: 5,
  }),
  account({
    id: "demo-apple",
    serviceName: "Apple Account",
    accountLabel: "Phone",
    loginIdentifier: "demo.person@example.com",
    websiteUrl: "https://account.apple.com/",
    category: "devices",
    created: 150,
    updated: 60,
  }),
  account({
    id: "demo-old-forum",
    serviceName: "Old Forum",
    accountLabel: null,
    loginIdentifier: "demo-legacy",
    websiteUrl: null,
    category: "other",
    status: "inactive",
    created: 400,
    updated: 200,
  }),
]
