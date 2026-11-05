// Push notifications. KoriAI's own dedicated pipeline — separate from
// Orbit/dailygoalmap's: subscriptions live in `public.kori_push_subscriptions`
// / `public.kori_telegram_links` (RLS: owner-only), keyed to KoriAI's own
// VAPID identity, and delivery goes through `kori-send-push` /
// `kori-send-telegram`. Telegram shares the same bot as Orbit (a bot can only
// have one webhook), so `telegram-webhook` was extended with an additive
// fallback for `kori_telegram_link_codes` — Orbit's own path is untouched.
import { supabase } from "@/lib/supabase"
import { getUserId } from "@/lib/auth-store"

export interface TelegramLink {
  deepLink: string | null
  code: string
  botUsername: string | null
}

// Browser PushSubscription.toJSON() shape.
export interface WebPushSubscriptionJSON {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

const TELEGRAM_BOT_USERNAME = "OrbitReminderBot"

function randomLinkCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

export const pushApi = {
  // ── Telegram ──
  telegramLink: async (): Promise<TelegramLink> => {
    const userId = getUserId()
    if (!userId) throw new Error("Not signed in")
    const code = randomLinkCode()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const { error } = await supabase
      .from("kori_telegram_link_codes")
      .insert({ code, user_id: userId, expires_at: expiresAt })
    if (error) throw error
    return {
      deepLink: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}`,
      code,
      botUsername: TELEGRAM_BOT_USERNAME,
    }
  },

  telegramStatus: async (): Promise<{ linked: boolean }> => {
    const userId = getUserId()
    if (!userId) return { linked: false }
    const { data, error } = await supabase
      .from("kori_telegram_links")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()
    if (error) throw error
    return { linked: !!data }
  },

  telegramUnlink: async () => {
    const userId = getUserId()
    if (!userId) return
    await supabase.from("kori_telegram_links").delete().eq("user_id", userId)
  },

  // ── Web Push ──
  vapidPublicKey: async (): Promise<{ publicKey: string }> => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_KEY ?? ""
    if (!publicKey) throw new Error("Web Push is not configured (missing VAPID key).")
    return { publicKey }
  },

  webSubscribe: async (sub: WebPushSubscriptionJSON) => {
    const userId = getUserId()
    if (!userId) throw new Error("Not signed in")
    const { error } = await supabase.from("kori_push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth_key: sub.keys.auth,
      },
      { onConflict: "endpoint" },
    )
    if (error) throw error
  },

  webUnsubscribe: async (endpoint: string) => {
    const userId = getUserId()
    if (!userId) return
    await supabase
      .from("kori_push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint)
  },

  // Sends a real push to the current user via KoriAI's own `kori-send-push`
  // function — used by the Settings page's "send test notification" action.
  sendTest: async () => {
    const userId = getUserId()
    if (!userId) throw new Error("Not signed in")
    const { data, error } = await supabase.functions.invoke("kori-send-push", {
      body: {
        userId,
        title: "H-Space",
        body: "Push notifications are working 🎉",
        url: "/settings",
        tag: "koriai-test",
      },
    })
    if (error) throw error
    return data as { sent: number; total: number; removedStale: number }
  },

  // Sends a real Telegram message to the current user via `kori-send-telegram`.
  sendTelegramTest: async () => {
    const userId = getUserId()
    if (!userId) throw new Error("Not signed in")
    const { data, error } = await supabase.functions.invoke("kori-send-telegram", {
      body: {
        userId,
        title: "H-Space",
        body: "Telegram notifications are working 🎉",
        url: "https://hengo.henheang.site/settings",
      },
    })
    if (error) throw error
    return data as { sent: number }
  },
}
