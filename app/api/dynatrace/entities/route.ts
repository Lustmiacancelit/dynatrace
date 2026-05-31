import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEntities } from "@/lib/dynatrace";

export async function GET(req: NextRequest) {
  if (!getSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type") ?? "SERVICE";

  try {
    const data = await getEntities(type);
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to fetch entities";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
