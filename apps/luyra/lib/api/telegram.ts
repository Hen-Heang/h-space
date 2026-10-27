import { apiFetch } from "@/lib/api/client";
import type { TelegramLinkCode, TelegramLinkStatus } from "@/types/telegram";

export function getTelegramLinkStatus(): Promise<TelegramLinkStatus> {
  return apiFetch<TelegramLinkStatus>("/api/telegram/link");
}

export function generateTelegramLinkCode(): Promise<TelegramLinkCode> {
  return apiFetch<TelegramLinkCode>("/api/telegram/link", { method: "POST" });
}

export async function unlinkTelegramAccount(): Promise<void> {
  await apiFetch<{ unlinked: boolean }>("/api/telegram/link", { method: "DELETE" });
}
