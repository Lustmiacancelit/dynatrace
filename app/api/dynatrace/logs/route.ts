import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getLogs } from "@/lib/dynatrace";

export async function GET(req: NextRequest) {
  if (!getSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = req.nextUrl.searchParams.get("query") ?? "";
  const from = req.nextUrl.searchParams.get("from") ?? "now-1h";
  const limit = req.nextUrl.searchParams.get("limit") ?? "50";

  try {
    const data = await getLogs(query, from, limit);
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to fetch logs";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
