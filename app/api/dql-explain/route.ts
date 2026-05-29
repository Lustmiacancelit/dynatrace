// app/api/dql-explain/route.ts
import { NextRequest, NextResponse } from "next/server";
import { dqlToNl } from "@/lib/dynatrace";
import { explainDqlWithClaude } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const { query } = await req.json();

  if (!query?.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  // Try Dynatrace DQL2NL first
  try {
    const explanation = await dqlToNl(query);
    if (explanation) {
      return NextResponse.json({ explanation, source: "dynatrace" });
    }
  } catch (dtError) {
    console.warn("Dynatrace DQL2NL failed, falling back to Claude:", dtError);
  }

  // Fall back to Claude
  try {
    const explanation = await explainDqlWithClaude(query);
    return NextResponse.json({ explanation, source: "claude" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to explain DQL" },
      { status: 500 }
    );
  }
}
