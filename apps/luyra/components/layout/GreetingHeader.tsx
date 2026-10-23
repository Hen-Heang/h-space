import { UserAvatar } from "@/components/ui/UserAvatar";
import { greetingFor } from "@/lib/greeting";
import { accountItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/types/user";

/**
 * Personal header for a landing surface: avatar, the time-of-day greeting, and
 * who's signed in. Deliberately not a heading — `MobileHeader` already owns the
 * page's `h1`, so this reads as an identity strip rather than a second title.
 */
export function GreetingHeader({ user, className }: { user: AppUser; className?: string }) {
  const { label, emoji } = greetingFor(user.timezone);
  const name = user.displayName?.trim() || user.email.split("@")[0]!;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <UserAvatar
        href={accountItem.href}
        className="size-10 rounded-full"
        email={user.email}
        name={user.displayName}
        avatarUrl={user.avatarUrl}
      />
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">
          {label} {emoji}
        </p>
        <p className="truncate text-lg font-bold uppercase tracking-tight text-foreground sm:text-xl">{name}</p>
      </div>
    </div>
  );
}
