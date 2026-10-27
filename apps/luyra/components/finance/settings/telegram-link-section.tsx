"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateTelegramLinkCode, getTelegramLinkStatus, unlinkTelegramAccount } from "@/lib/api/telegram";
import type { TelegramLinkStatus } from "@/types/telegram";

export function TelegramLinkSection() {
  const [status, setStatus] = useState<TelegramLinkStatus | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function refresh() {
    getTelegramLinkStatus()
      .then((data) => {
        setStatus(data);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleGenerateCode() {
    setGenerating(true);
    setActionError(null);
    try {
      const result = await generateTelegramLinkCode();
      setDeepLink(result.deepLink);
      refresh();
    } catch {
      setActionError("Couldn't generate a code. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleUnlink() {
    setUnlinking(true);
    setActionError(null);
    try {
      await unlinkTelegramAccount();
      setDeepLink(null);
      refresh();
    } catch {
      setActionError("Couldn't unlink. Try again.");
    } finally {
      setUnlinking(false);
    }
  }

  if (loadError) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
        We couldn&apos;t load your Telegram link status.{" "}
        <button type="button" onClick={refresh} className="font-semibold underline-offset-4 hover:underline">
          Try again
        </button>
      </p>
    );
  }

  if (!status) {
    return <div className="h-20 rounded-2xl bg-secondary motion-safe:animate-pulse" />;
  }

  if (!status.configured) {
    return (
      <div className="rounded-2xl border bg-card p-4">
        <p className="text-sm font-medium">Telegram integration isn&apos;t configured</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Set <code className="rounded bg-secondary px-1 py-0.5">TELEGRAM_BOT_TOKEN</code> and{" "}
          <code className="rounded bg-secondary px-1 py-0.5">TELEGRAM_WEBHOOK_SECRET</code> to enable linking a Telegram
          chat for report delivery.
        </p>
      </div>
    );
  }

  if (status.linked) {
    return (
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex flex-col items-start gap-3 xs:flex-row xs:items-center xs:justify-between">
          <p className="flex items-center gap-1.5 text-sm font-medium text-success">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Linked{status.telegramUsername ? ` as @${status.telegramUsername}` : ""}
          </p>
          <Button variant="outline" size="sm" onClick={handleUnlink} disabled={unlinking}>
            {unlinking ? "Unlinking…" : "Unlink"}
          </Button>
        </div>
        {actionError && <p className="mt-2 text-xs text-destructive">{actionError}</p>}
        <p className="mt-2 text-xs text-muted-foreground">Use the Reports section below to send a report to this chat.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-sm font-medium">Link a Telegram chat</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Generate a code, then send it to your bot as <code className="rounded bg-secondary px-1 py-0.5">/link CODE</code>.
      </p>

      {status.pendingCode ? (
        <div className="mt-3 space-y-2">
          <p className="font-mono text-2xl font-semibold tracking-widest">{status.pendingCode}</p>
          {deepLink && (
            <a
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-secondary sm:min-h-9"
            >
              <Send className="size-4" aria-hidden="true" />
              Open in Telegram
            </a>
          )}
          <p className="text-xs text-muted-foreground">
            Expires {new Date(status.pendingCodeExpiresAt as string).toLocaleTimeString()}.{" "}
            <button type="button" onClick={refresh} className="font-semibold underline-offset-4 hover:underline">
              Check status
            </button>
          </p>
        </div>
      ) : (
        <Button size="sm" className="mt-3 min-h-11" onClick={handleGenerateCode} disabled={generating}>
          {generating ? <Loader2 className="size-4 animate-spin" /> : null}
          {generating ? "Generating…" : "Generate code"}
        </Button>
      )}
      {actionError && <p className="mt-2 text-xs text-destructive">{actionError}</p>}
    </div>
  );
}
