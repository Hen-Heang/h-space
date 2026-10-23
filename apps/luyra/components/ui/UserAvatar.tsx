import Link from "next/link";

import { cn } from "@/lib/utils";

type UserAvatarProps = {
  /** Tailwind sizing/shape overrides for the avatar box. */
  className?: string;
  /** When set, the avatar becomes a link (e.g. to account settings). */
  href?: string;
  /** Accessible label / tooltip. */
  title?: string;
  /** Signed-in user's email, used to derive the initials fallback. */
  email?: string | null;
  /** Preferred source for the initials fallback when the account has a name. */
  name?: string | null;
  /** Profile photo carried over from the identity provider, when there is one. */
  avatarUrl?: string | null;
};

function initials(name: string | null | undefined, email: string | null | undefined): string {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    const letters = parts.length > 1 ? `${parts[0]![0]}${parts[parts.length - 1]![0]}` : trimmed.slice(0, 2);
    return letters.toUpperCase();
  }
  if (!email) return "?";
  return email.split("@")[0]!.slice(0, 2).toUpperCase();
}

/** The signed-in user's photo when the provider gave us one, their initials otherwise. */
export function UserAvatar({ className, href, title = "Your account", email, name, avatarUrl }: UserAvatarProps) {
  const box = cn(
    "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm ring-1 ring-border/50",
    className
  );

  const inner = avatarUrl ? (
    // Provider photos come from arbitrary hosts (Google, GitHub, ...), so they
    // can't go through next/image without allow-listing every one of them.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
  ) : (
    <span>{initials(name, email)}</span>
  );

  if (href) {
    return (
      <Link href={href} title={title} aria-label={title} className={box}>
        {inner}
      </Link>
    );
  }

  return (
    <span title={title} className={box}>
      {inner}
    </span>
  );
}
