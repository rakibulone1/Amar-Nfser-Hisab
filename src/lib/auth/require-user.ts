import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasSupabaseEnvironment } from "@/lib/env";

/**
 * The proxy verifies the cookie-backed JWT once per incoming page request and
 * places the verified subject/email into request headers after removing any
 * client-supplied values. Server Components consume that trusted context rather
 * than asking Supabase Auth to verify the same token a second time.
 */
export const requireUser = cache(async function requireUserForRequest() {
  if (!hasSupabaseEnvironment) redirect("/login?setup=1");
  const requestHeaders = await headers();
  const userId = requestHeaders.get("x-verified-user-id");
  const userEmail = requestHeaders.get("x-verified-user-email") || "";
  if (!userId || userId.length > 128) redirect("/login");
  return { userId, userEmail };
});
