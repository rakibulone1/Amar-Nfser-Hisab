import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnvironment } from "@/lib/env";
import { getSupabaseSecretKey } from "@/lib/env.server";

/** Elevated Supabase client. Never import this module from a Client Component. */
export function createSupabaseAdminClient() {
  const { url } = getSupabaseEnvironment();
  return createClient(url, getSupabaseSecretKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}
