import "server-only";
import { Resend } from "resend";

let client: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

// Resend's sandbox sender for accounts without a verified sending domain —
// used unless the deployer sets RESEND_FROM_EMAIL to a verified address.
const DEFAULT_FROM = "Luyra <onboarding@resend.dev>";

export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const resend = getClient();
  if (!resend) return { ok: false, error: "not_configured" };

  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      console.error("[email] Resend send failed", error.message);
      return { ok: false, error: "send_failed" };
    }
    return { ok: true };
  } catch (error) {
    console.error("[email] send error", error);
    return { ok: false, error: "send_failed" };
  }
}

// Every interpolated user- or transaction-derived string must pass through
// this before landing in the HTML body — never trust it as markup-safe.
export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
