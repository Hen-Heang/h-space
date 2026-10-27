"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    if (window.google?.accounts.id) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google sign-in."));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

async function createNoncePair(): Promise<{ raw: string; hashed: string }> {
  const random = crypto.getRandomValues(new Uint8Array(32));
  const raw = btoa(String.fromCharCode(...random)).replace(/[+/=]/g, "");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return { raw, hashed };
}

export function HengoGoogleSignIn({
  redirectTo,
  onError,
  onPendingChange,
}: {
  redirectTo: string;
  onError: (message: string | null) => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      onError("Google sign-in is not configured.");
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        await loadGoogleIdentityScript();
        if (cancelled || !containerRef.current || !window.google) return;

        const nonce = await createNoncePair();
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: nonce.hashed,
          callback: async (response: { credential?: string }) => {
            if (!response.credential) {
              onError("Google did not return a sign-in credential.");
              return;
            }

            onError(null);
            onPendingChange(true);
            const supabase = createClient();
            const { error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: response.credential,
              nonce: nonce.raw,
            });

            if (error) {
              onPendingChange(false);
              onError(error.message);
              return;
            }

            router.replace(redirectTo);
            router.refresh();
          },
        });

        const container = containerRef.current;
        const buttonWidth = Math.min(352, Math.max(200, Math.floor(container.clientWidth)));
        container.replaceChildren();
        window.google.accounts.id.renderButton(container, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: buttonWidth,
        });
      } catch (error) {
        if (!cancelled) {
          onError(error instanceof Error ? error.message : "Could not load Google sign-in.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onError, onPendingChange, redirectTo, router]);

  return <div ref={containerRef} className="flex min-h-10 justify-center" />;
}
