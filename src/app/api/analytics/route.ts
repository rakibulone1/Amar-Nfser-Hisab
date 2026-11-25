import { NextRequest, NextResponse } from "next/server";
import { getApiContext, isErrorResponse } from "@/lib/api/context";
import { getNafsReport } from "@/modules/nafs-mirror/report";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;

  const params = request.nextUrl.searchParams;
  const range = params.get("range");
  const from = params.get("from");
  const to = params.get("to");
  const compare = params.get("compare") === "true";

  try {
    const report = await getNafsReport(context.supabase, context.user.id, {
      rangeKey: range,
      from,
      to,
      compare
    });
    return NextResponse.json(report, {
      headers: { "Cache-Control": "private, no-store, max-age=0" }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "রিপোর্ট তৈরি করা যায়নি।";
    return NextResponse.json({ message }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
