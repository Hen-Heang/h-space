"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removePushSubscription, savePushSubscription } from "@/lib/api/push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

type PushState =
  | "loading"
  | "unsupported"
  | "not_configured"
  | "denied"
  | "disabled"
  | "enabled";

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = Uint8Array.from(raw, (char) => char.charCodeAt(0));
  return new Uint8Array(bytes.buffer);
}

function subscriptionInput(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) {
    throw new Error("The browser returned an incomplete push subscription.");
  }
  return { endpoint: json.endpoint, p256dh, auth };
}

function browserSupportsPush(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function PushNotificationSettings() {
  const [state, setState] = useState<PushState>("loading");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function inspect() {
      if (!browserSupportsPush()) {
        if (active) setState("unsupported");
        return;
      }
      if (!VAPID_PUBLIC_KEY) {
        if (active) setState("not_configured");
        return;
      }
      if (Notification.permission === "denied") {
        if (active) setState("denied");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (!active) return;

        if (existing) {
          setState("enabled");
          // Keep Neon in sync if the browser retained a subscription while the
          // server record was removed or this user signed in on the same device.
          await savePushSubscription(subscriptionInput(existing));
        } else {
          setState("disabled");
        }
      } catch {
        if (active) {
          setState("disabled");
          setError("Couldn't check this browser's notification subscription.");
        }
      }
    }

    void inspect();
    return () => {
      active = false;
    };
  }, []);

  async function enablePush() {
    if (!VAPID_PUBLIC_KEY || !browserSupportsPush()) return;
    setPending(true);
    setError(null);

    try {
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setState("denied");
        return;
      }
      if (permission !== "granted") {
        setState("disabled");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

      await savePushSubscription(subscriptionInput(subscription));
      setState("enabled");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't enable notifications.");
      setState("disabled");
    } finally {
      setPending(false);
    }
  }

  async function disablePush() {
    if (!browserSupportsPush()) return;
    setPending(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        try {
          await removePushSubscription(subscription.endpoint);
        } finally {
          await subscription.unsubscribe();
        }
      }
      setState("disabled");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't disable notifications.");
    } finally {
      setPending(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-24 items-center gap-3 rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Checking this browser…
      </div>
    );
  }

  if (state === "unsupported") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border bg-card p-4">
        <BellOff className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">Push notifications aren&apos;t supported here</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Use a modern browser with service-worker and Web Push support.</p>
        </div>
      </div>
    );
  }

  if (state === "not_configured") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-4">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">Push notifications aren&apos;t configured for this deployment</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Add the Luyra VAPID keys in the deployment environment, then redeploy.</p>
        </div>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-4">
        <BellOff className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">Notifications are blocked by your browser</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Allow notifications for this site in your browser settings, then reload Luyra.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
            <Bell className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold">Browser notifications</p>
            <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
              Get privacy-friendly budget status alerts on this device, even when Luyra isn&apos;t open. Each browser or device is enabled separately.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant={state === "enabled" ? "outline" : "default"}
          className="min-h-11 w-full shrink-0 sm:w-auto"
          disabled={pending}
          onClick={() => void (state === "enabled" ? disablePush() : enablePush())}
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : state === "enabled" ? <BellOff className="size-4" aria-hidden="true" /> : <Bell className="size-4" aria-hidden="true" />}
          {pending ? "Updating…" : state === "enabled" ? "Disable on this device" : "Enable on this device"}
        </Button>
      </div>

      <p className="text-xs font-medium text-muted-foreground" role="status">
        {state === "enabled" ? "Enabled on this browser." : "Off on this browser."}
      </p>
      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
