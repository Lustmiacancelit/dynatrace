import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProblems } from "@/lib/dynatrace";

export async function GET() {
  if (!getSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await getProblems();
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to fetch problems";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
