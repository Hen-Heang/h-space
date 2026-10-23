import {
  siAirbnb,
  siAliexpress,
  siAnthropic,
  siApple,
  siAtlassian,
  siBinance,
  siBitbucket,
  siBitwarden,
  siClaude,
  siCloudflare,
  siCoinbase,
  siCoursera,
  siDigitalocean,
  siDiscord,
  siDocker,
  siDropbox,
  siDuolingo,
  siEvernote,
  siFacebook,
  siFigma,
  siFirebase,
  siGithub,
  siGitlab,
  siGmail,
  siGodaddy,
  siGoogle,
  siGoogledrive,
  siGooglegemini,
  siGrab,
  siHostinger,
  siHuawei,
  siHuggingface,
  siIcloud,
  siInstagram,
  siJetbrains,
  siJira,
  siKakaotalk,
  siLeetcode,
  siLine,
  siMedium,
  siNamecheap,
  siNaver,
  siNetflix,
  siNetlify,
  siNotion,
  siNpm,
  siPaypal,
  siPerplexity,
  siPinterest,
  siPlaystation,
  siPostman,
  siProton,
  siProtonmail,
  siRailway,
  siReddit,
  siRender,
  siRevolut,
  siShopee,
  siSpotify,
  siStackoverflow,
  siSteam,
  siStripe,
  siSupabase,
  siTelegram,
  siThreads,
  siTiktok,
  siTodoist,
  siTrello,
  siTwitch,
  siUber,
  siUdemy,
  siVercel,
  siWechat,
  siWhatsapp,
  siWise,
  siX,
  siXiaomi,
  siYoutube,
  siZoom,
  type SimpleIcon,
} from "simple-icons"

// Platform logos for H-Vault cards, resolved from the service name (then the
// website's domain). Logos are bundled from `simple-icons` (CC0) — only the
// ones imported above ship — so showing them never contacts a third party
// and never leaks which services you use. Brands that simple-icons doesn't
// carry (trademark removals such as Microsoft or LinkedIn) get their brand
// color on the letter avatar instead. Framework-free and tested
// (lib/vault-brands.test.ts).

export type ServiceBrand =
  | { kind: "icon"; title: string; hex: string; path: string }
  /** Brand-colored badge; `label` (e.g. "KB") replaces the first letter. */
  | { kind: "color"; title: string; hex: string; label?: string }
  /**
   * A simple geometric mark drawn here (not from simple-icons), on a 24×24
   * grid. `full` fills the whole avatar (it carries its own background);
   * `tile` sits on the neutral avatar background.
   */
  | {
      kind: "art"
      title: string
      layout: "full" | "tile"
      shapes: Array<{ d: string; fill: string }>
    }

const icon = (si: SimpleIcon): ServiceBrand => ({
  kind: "icon",
  title: si.title,
  hex: `#${si.hex}`,
  path: si.path,
})
const color = (title: string, hex: string, label?: string): ServiceBrand => ({
  kind: "color",
  title,
  hex,
  ...(label ? { label } : {}),
})

// Hand-drawn marks for brands simple-icons no longer carries but whose logo
// is plain geometry, so a faithful drawing is possible.
const MICROSOFT: ServiceBrand = {
  kind: "art",
  title: "Microsoft",
  layout: "tile",
  shapes: [
    { d: "M2 2h9.5v9.5H2z", fill: "#F25022" },
    { d: "M12.5 2H22v9.5h-9.5z", fill: "#7FBA00" },
    { d: "M2 12.5h9.5V22H2z", fill: "#00A4EF" },
    { d: "M12.5 12.5H22V22h-9.5z", fill: "#FFB900" },
  ],
}
const LINKEDIN: ServiceBrand = {
  kind: "art",
  title: "LinkedIn",
  layout: "full",
  shapes: [
    { d: "M0 0h24v24H0z", fill: "#0A66C2" },
    { d: "M7 4.9a1.75 1.75 0 1 1 0 3.5a1.75 1.75 0 1 1 0-3.5z", fill: "#FFFFFF" },
    { d: "M5.5 9.6h3v9.4h-3z", fill: "#FFFFFF" },
    {
      d: "M10.4 9.6h2.9v1.3c.5-.9 1.7-1.6 3.1-1.6 3 0 3.6 1.9 3.6 4.5v5.2h-3v-4.6c0-1.1 0-2.5-1.6-2.5s-1.9 1.2-1.9 2.4v4.7h-3.1z",
      fill: "#FFFFFF",
    },
  ],
}

// Banks and services without a usable public mark get a labelled badge. The
// bank colors are close approximations of each brand, not official values.
const KB_BANK = color("KB Kookmin Bank", "#FFBC00", "KB")
const ABA_BANK = color("ABA Bank", "#005B7F", "ABA")
const PPC_BANK = color("PPC Bank", "#1F3D7A", "PPC")

// Work tools (Korea / Cambodia). No public mark is bundled; colors are
// approximations, not official brand values.
const BIZPLAY = color("Bizplay", "#1F5EFF", "B")
const FLOW = color("Flow", "#6B4EFF", "F")
const KOSIGN = color("Kosign", "#0B7A75", "K")
const PRIVACY_I = color("Privacy-i", "#2F5D8A", "Pi")
const HUAWEI = icon(siHuawei)

/**
 * Alias (lowercase letters/digits only) → brand. Keys double as domain labels
 * (`github` matches github.com, `naver` matches nid.naver.com).
 */
const BRANDS: Record<string, ServiceBrand> = {
  // Code & cloud
  github: icon(siGithub),
  gitlab: icon(siGitlab),
  bitbucket: icon(siBitbucket),
  vercel: icon(siVercel),
  netlify: icon(siNetlify),
  supabase: icon(siSupabase),
  firebase: icon(siFirebase),
  cloudflare: icon(siCloudflare),
  docker: icon(siDocker),
  dockerhub: icon(siDocker),
  npm: icon(siNpm),
  npmjs: icon(siNpm),
  railway: icon(siRailway),
  render: icon(siRender),
  digitalocean: icon(siDigitalocean),
  jetbrains: icon(siJetbrains),
  postman: icon(siPostman),
  stackoverflow: icon(siStackoverflow),
  leetcode: icon(siLeetcode),
  atlassian: icon(siAtlassian),
  jira: icon(siJira),
  trello: icon(siTrello),
  godaddy: icon(siGodaddy),
  namecheap: icon(siNamecheap),
  hostinger: icon(siHostinger),
  heroku: color("Heroku", "#430098"),
  aws: color("AWS", "#FF9900"),
  amazonwebservices: color("AWS", "#FF9900"),
  // Google, Apple, Microsoft
  google: icon(siGoogle),
  gmail: icon(siGmail),
  googledrive: icon(siGoogledrive),
  drive: icon(siGoogledrive),
  youtube: icon(siYoutube),
  gemini: icon(siGooglegemini),
  googlegemini: icon(siGooglegemini),
  apple: icon(siApple),
  appleid: icon(siApple),
  icloud: icon(siIcloud),
  microsoft: MICROSOFT,
  microsoftaccount: MICROSOFT,
  office: MICROSOFT,
  office365: MICROSOFT,
  xbox: MICROSOFT,
  outlook: color("Outlook", "#0078D4"),
  hotmail: color("Outlook", "#0078D4"),
  live: MICROSOFT,
  // AI tools
  openai: color("OpenAI", "#000000"),
  openaiplatform: color("OpenAI", "#000000"),
  chatgpt: color("ChatGPT", "#10A37F"),
  anthropic: icon(siAnthropic),
  claude: icon(siClaude),
  perplexity: icon(siPerplexity),
  huggingface: icon(siHuggingface),
  // Social & messaging
  facebook: icon(siFacebook),
  instagram: icon(siInstagram),
  threads: icon(siThreads),
  x: icon(siX),
  twitter: icon(siX),
  tiktok: icon(siTiktok),
  discord: icon(siDiscord),
  telegram: icon(siTelegram),
  whatsapp: icon(siWhatsapp),
  wechat: icon(siWechat),
  line: icon(siLine),
  reddit: icon(siReddit),
  pinterest: icon(siPinterest),
  medium: icon(siMedium),
  twitch: icon(siTwitch),
  linkedin: LINKEDIN,
  slack: color("Slack", "#4A154B"),
  // Korea & local
  // simple-icons' Kakao/Samsung/eBay logos are wordmarks, unreadable at
  // avatar size: Kakao uses its KakaoTalk bubble, the others a brand color.
  kakao: icon(siKakaotalk),
  kakaotalk: icon(siKakaotalk),
  naver: icon(siNaver),
  coupang: color("Coupang", "#E52528"),
  // Banks (Korea & Cambodia). 2-letter names only match as the whole name
  // ("KB") or a compound ("KB Bank" → kbbank), never as a stray word.
  kb: KB_BANK,
  kbbank: KB_BANK,
  kbkookmin: KB_BANK,
  kbkookminbank: KB_BANK,
  kookmin: KB_BANK,
  kookminbank: KB_BANK,
  kbstar: KB_BANK,
  kbcard: KB_BANK,
  aba: ABA_BANK,
  ababank: ABA_BANK,
  ppc: PPC_BANK,
  ppcbank: PPC_BANK,
  // Work tools.
  bizplay: BIZPLAY,
  flow: FLOW,
  flowteam: FLOW,
  kosign: KOSIGN,
  privacyi: PRIVACY_I,
  privacyiagent: PRIVACY_I,
  // Huawei, plus the common misspellings so imported rows still match.
  huawei: HUAWEI,
  huaweiid: HUAWEI,
  hauwei: HUAWEI,
  hauwie: HUAWEI,
  huawie: HUAWEI,
  toss: color("Toss", "#0064FF"),
  baemin: color("Baemin", "#2AC1BC"),
  samsung: color("Samsung", "#1428A0"),
  // Finance & shopping
  paypal: icon(siPaypal),
  stripe: icon(siStripe),
  revolut: icon(siRevolut),
  wise: icon(siWise),
  binance: icon(siBinance),
  coinbase: icon(siCoinbase),
  ebay: color("eBay", "#E53238"),
  aliexpress: icon(siAliexpress),
  shopee: icon(siShopee),
  amazon: color("Amazon", "#FF9900"),
  grab: icon(siGrab),
  uber: icon(siUber),
  airbnb: icon(siAirbnb),
  // Productivity & learning
  notion: icon(siNotion),
  figma: icon(siFigma),
  canva: color("Canva", "#00C4CC"),
  dropbox: icon(siDropbox),
  evernote: icon(siEvernote),
  todoist: icon(siTodoist),
  zoom: icon(siZoom),
  bitwarden: icon(siBitwarden),
  proton: icon(siProton),
  protonmail: icon(siProtonmail),
  yahoo: color("Yahoo", "#6001D2"),
  duolingo: icon(siDuolingo),
  udemy: icon(siUdemy),
  coursera: icon(siCoursera),
  // Entertainment & devices
  netflix: icon(siNetflix),
  spotify: icon(siSpotify),
  steam: icon(siSteam),
  playstation: icon(siPlaystation),
  xiaomi: icon(siXiaomi),
}

const squash = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "")

/** Words too generic to identify a platform on their own. */
const IGNORED_TOKENS = new Set(["account", "accounts", "personal", "work", "main", "login"])

/**
 * Aliases that are also everyday words. They match only as the whole service
 * name or a website domain label, never as one word of a longer name, so
 * "Money Flow" or "Work Drive" don't pick up the Flow or Google Drive logo.
 */
const COMMON_WORD_ALIASES = new Set([
  "flow",
  "drive",
  "live",
  "render",
  "medium",
  "wise",
  "grab",
  "office",
])

/**
 * The brand for a service, or null (→ the plain letter avatar).
 *
 * 1. The whole name ("Google", "Kakao Talk" → `kakaotalk`).
 * 2. Each word of the name, 3+ letters, so "GitHub Secondary" and
 *    "Apple Account" resolve but a stray "x" in a longer name doesn't.
 * 3. Each label of the website's hostname (accounts.google.com → `google`).
 */
export function resolveServiceBrand(
  serviceName: string,
  websiteUrl?: string | null,
): ServiceBrand | null {
  const whole = squash(serviceName)
  if (whole && BRANDS[whole]) return BRANDS[whole]

  const tokens = serviceName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !IGNORED_TOKENS.has(t))
  for (const token of tokens) {
    if (BRANDS[token] && !COMMON_WORD_ALIASES.has(token)) return BRANDS[token]
  }

  if (websiteUrl) {
    let host = ""
    try {
      host = new URL(websiteUrl).hostname.toLowerCase()
    } catch {
      return null
    }
    for (const label of host.split(".")) if (BRANDS[label]) return BRANDS[label]
  }
  return null
}

function luminance(hex: string): number {
  const value = hex.replace("#", "")
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(value.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * How to paint a brand so it stays legible in light and dark themes:
 * - `ink`   near-black brands (GitHub, X, Notion, Apple) use the theme's
 *           foreground color instead, so they don't vanish in dark mode;
 * - `solid` very light brands (Kakao yellow) sit on their color with a dark mark;
 * - `tint`  everything else: brand-colored mark on a faint brand tint.
 */
export function brandTone(hex: string): "ink" | "solid" | "tint" {
  const l = luminance(hex)
  if (l < 0.03) return "ink"
  if (l > 0.55) return "solid"
  return "tint"
}
