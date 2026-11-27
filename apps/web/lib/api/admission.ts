import { interpretAdmission, type Admission } from "@/lib/auth-v2"
import { supabase } from "@/lib/supabase"

// H-Space admission (Auth V2, decision H13): is this Supabase user an approved
// H-Space member? The shared Supabase project also serves Orbit, so a valid
// session alone is not membership.
//
// Reads the caller's own kori_app_access row with the caller's own session:
// RLS returns at most that row, the browser can't write the table, and the
// read works at aal1 (no MFA policy on this one table) so a user can learn
// whether to continue to the code step. This is UX and an early stop - the
// authority is the database policy and h-space-api's own per-request check.

/** An answer that takes longer than this counts as unavailable (never as allowed). */
export const ADMISSION_TIMEOUT_MS = 8_000

export const admissionApi = {
  check: async (userId: string, timeoutMs = ADMISSION_TIMEOUT_MS): Promise<Admission> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const read = supabase
        .from("kori_app_access")
        .select("status")
        .eq("user_id", userId)
        .limit(2)
        .abortSignal(controller.signal)
        .then(({ data, error }) => interpretAdmission(data, error))
      const timedOut = new Promise<Admission>((resolve) =>
        controller.signal.addEventListener("abort", () => resolve("unavailable")),
      )
      return await Promise.race([read, timedOut])
    } catch {
      return "unavailable"
    } finally {
      clearTimeout(timer)
    }
  },
}
