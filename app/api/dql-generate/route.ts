// app/api/dql-generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { nlToDql } from "@/lib/dynatrace";
import { generateDqlWithClaude } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const { prompt, history = [], image = null } = await req.json();

  if (!prompt?.trim() && !image) {
    return NextResponse.json({ error: "Prompt or image is required" }, { status: 400 });
  }

  // Strip image blocks from history to avoid media_type issues
  const cleanHistory = history.map((msg: { role: string; content: unknown }) => {
    if (Array.isArray(msg.content)) {
      // Keep only text blocks from history
      const textOnly = (msg.content as Array<{ type: string; text?: string }>)
        .filter((block) => block.type === "text")
        .map((block) => block.text || "")
        .join(" ");
      return { role: msg.role, content: textOnly };
    }
    return msg;
  });

  // Try Dynatrace first (only if no image)
  if (!image) {
    try {
      const dql = await nlToDql(prompt);
      if (dql) return NextResponse.json({ dql, source: "dynatrace" });
    } catch {
      // Fall through to Claude
    }
  }

  // Claude with cleaned history + optional image
  try {
    const result = await generateDqlWithClaude(prompt, cleanHistory, image);
    return NextResponse.json({ dql: result.dql, message: result.message, source: "claude" });
  } catch (claudeError) {
    return NextResponse.json({ error: String(claudeError) }, { status: 500 });
  }
}