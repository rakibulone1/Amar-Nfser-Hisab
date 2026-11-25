import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnvironment } from "@/lib/env";
import { isSameOriginRequest } from "@/lib/security/request";
import type { Database } from "@/types/database";

type ServerSupabaseClient = SupabaseClient<Database>;
type ApiUser = { id: string; email: string | null };
export type ApiErrorContext = { response: NextResponse<{ message: string }>; supabase?: never; user?: never };
export type ApiContextResult =
  | ApiErrorContext
  | { response?: never; supabase: ServerSupabaseClient; user: ApiUser };

function errorResponse(message: string, status: number): ApiErrorContext {
  return { response: NextResponse.json({ message }, { status }) };
}

export async function getApiContext(request: NextRequest): Promise<ApiContextResult> {
  if (!( ["GET", "HEAD", "OPTIONS"].includes(request.method) || isSameOriginRequest(request))) {
    return errorResponse("অনুরোধটি গ্রহণ করা হয়নি।", 403);
  }
  if (!hasSupabaseEnvironment) return errorResponse("Supabase সেটআপ করা হয়নি।", 503);

  const supabase = await createClient();
  // getClaims verifies the signed access-token claims without an extra Auth API
  // round-trip. Database RLS remains the final authorization boundary.
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = claims?.sub;
  if (error || typeof userId !== "string") return errorResponse("আবার লগইন করো।", 401);

  return {
    supabase,
    user: { id: userId, email: typeof claims?.email === "string" ? claims.email : null }
  };
}

export function isErrorResponse(context: ApiContextResult): context is ApiErrorContext {
  return "response" in context;
}
