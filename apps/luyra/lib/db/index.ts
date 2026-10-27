import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Server-only Neon client. DATABASE_URL must never be exposed to the browser
// (no NEXT_PUBLIC_ prefix) — importing "server-only" makes any accidental
// Client Component import fail at build time instead of leaking the URL.
//
// Built lazily behind a Proxy: neon() throws immediately if DATABASE_URL is
// unset, which would otherwise crash `next build`'s route data collection
// (it imports every route module even for fully dynamic pages). Deferring
// construction to first query means a missing DATABASE_URL only fails an
// actual request, not the build.
let client: NeonQueryFunction<false, false> | undefined;

function getClient(): NeonQueryFunction<false, false> {
  return (client ??= neon(process.env.DATABASE_URL!));
}

export const sql: NeonQueryFunction<false, false> = new Proxy(
  (() => {}) as unknown as NeonQueryFunction<false, false>,
  {
    apply(_target, _thisArg, args) {
      return Reflect.apply(getClient(), getClient(), args);
    },
    get(_target, prop) {
      const value = Reflect.get(getClient(), prop);
      return typeof value === "function" ? value.bind(getClient()) : value;
    },
  }
);
