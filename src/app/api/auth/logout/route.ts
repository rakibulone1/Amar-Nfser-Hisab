import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnvironment } from "@/lib/env";
import { isSameOriginRequest } from "@/lib/security/request";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false }, { status: 403 });
  if (!hasSupabaseEnvironment) return NextResponse.json({ ok: false }, { status: 503 });
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
