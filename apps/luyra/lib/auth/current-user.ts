import "server-only";
import { createClient } from "@/lib/supabase/server";

// Canonical identity check for server-side code. The returned id (claims.sub)
// is the UUID used as users.id / tasks.user_id / goals.user_id in Neon —
// never trust a user id sent from the browser instead of this.
export async function getCurrentSupabaseUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
