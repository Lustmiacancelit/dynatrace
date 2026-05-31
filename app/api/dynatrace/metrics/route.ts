import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMetrics } from "@/lib/dynatrace";

export async function GET(req: NextRequest) {
  if (!getSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const selector = req.nextUrl.searchParams.get("selector") ?? "builtin:host.cpu.usage";
  const from = req.nextUrl.searchParams.get("from") ?? "now-1h";
  const requestedResolution = req.nextUrl.searchParams.get("resolution");
  const resolution =
    requestedResolution && requestedResolution !== "auto" ? requestedResolution : undefined;

  try {
    const data = await getMetrics(selector, from, resolution);
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to fetch metrics";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
