// app/api/dql-execute/route.ts
import { NextRequest, NextResponse } from "next/server";
import { executeDql } from "@/lib/dynatrace";

export async function POST(req: NextRequest) {
  const { query, timeframeStart, timeframeEnd } = await req.json();

  if (!query?.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  try {
    const results = await executeDql(
      query,
      timeframeStart ?? "now-2h",
      timeframeEnd ?? "now"
    );
    return NextResponse.json({ results });
  } catch (error) {
    console.error("DQL execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute DQL" },
      { status: 500 }
    );
  }
}
