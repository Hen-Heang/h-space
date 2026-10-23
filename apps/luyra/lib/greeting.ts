/** Hour of day (0-23) as it reads on the user's own clock, not the server's. */
function hourIn(timeZone: string, now: Date): number {
  const hour = new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(now);
  return Number(hour);
}

/**
 * The time-of-day greeting, split so a caller can take the words without the
 * emoji. Derived from the user's stored timezone because the server runs in
 * UTC — reading `Date#getHours()` there would greet a Seoul evening as
 * mid-morning.
 */
export function greetingFor(timeZone: string, now: Date = new Date()): { label: string; emoji: string } {
  const hour = hourIn(timeZone, now);
  if (hour < 12) return { label: "Good morning", emoji: "☀️" };
  if (hour < 18) return { label: "Good afternoon", emoji: "🌤️" };
  return { label: "Good evening", emoji: "🌙" };
}
