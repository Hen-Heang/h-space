import "server-only";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

/**
 * Sends one message and reports whether Telegram actually accepted it.
 *
 * A 2xx status is NOT proof of delivery. Anything between this process and
 * Telegram — a corporate proxy, a DLP appliance, a captive portal — can answer
 * 200 with an HTML block page, and treating that as success is worse than a
 * plain failure: the scheduled jobs record a delivery marker afterwards, so a
 * falsely "sent" weekly or monthly report is never retried. Success therefore
 * requires a parseable JSON body with `ok: true`, which only Telegram returns.
 */
export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("[telegram] TELEGRAM_BOT_TOKEN not configured");
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });

    const body = await response.text();

    let payload: { ok?: boolean; description?: string };
    try {
      payload = JSON.parse(body) as { ok?: boolean; description?: string };
    } catch {
      // Truncated: a block page is an entire HTML document, and the first
      // line is enough to recognize one in the logs.
      console.error(
        "[telegram] sendMessage got a non-JSON response — something between this server and Telegram intercepted the request",
        response.status,
        response.headers.get("content-type"),
        body.slice(0, 200)
      );
      return false;
    }

    if (!response.ok || payload.ok !== true) {
      console.error("[telegram] sendMessage rejected", response.status, payload.description ?? body.slice(0, 200));
      return false;
    }

    return true;
  } catch (error) {
    console.error("[telegram] sendMessage error", error);
    return false;
  }
}

// parse_mode: "HTML" requires manual escaping — never interpolate
// user-authored or transaction-derived text into a message without this.
export function escapeTelegramHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
