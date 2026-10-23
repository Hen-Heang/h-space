import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// A fresh client per request — @supabase/ssr reads/writes the request's
// cookies, so the client can't be cached across requests.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — the proxy is refreshing the
            // session on the way in, so this write can be safely ignored.
          }
        },
      },
    }
  );
}
