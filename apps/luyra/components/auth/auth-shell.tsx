import Image from "next/image";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-x-hidden overflow-y-auto bg-background px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 50% 18%, color-mix(in srgb, var(--success) 10%, transparent), transparent 32%), radial-gradient(circle at 82% 82%, color-mix(in srgb, var(--finance-chart) 9%, transparent), transparent 30%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.28] dark:opacity-[0.16]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in srgb, var(--border) 45%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--border) 45%, transparent) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(circle at center, black, transparent 72%)",
        }}
      />

      <div className="relative w-full max-w-[460px]">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-xl">
            <Image
              src="/icons/icon-192.png"
              alt=""
              width={32}
              height={32}
              className="size-8 rounded-xl"
              priority
            />
          </span>
          <div className="text-left">
            <p className="text-base font-semibold tracking-tight text-foreground">Luyra</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Personal finance
            </p>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/95 p-5 shadow-xl shadow-black/[0.07] xs:p-6 sm:p-8 dark:shadow-black/25">
          <div
            className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-success/40 to-transparent"
            aria-hidden="true"
          />

          <div className="mb-6 text-center sm:mb-7">
            <h1 className="text-xl font-semibold tracking-[-0.025em] text-foreground sm:text-2xl">
              {title}
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>

          {children}
        </section>

        <div className="mt-5 flex items-start justify-center gap-2 text-center text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
          <span className="break-words">Track, budget, save, and review in one private workspace.</span>
        </div>
      </div>
    </main>
  );
}
