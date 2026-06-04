import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!getSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured for Codex investigation." },
      { status: 500 }
    );
  }

  try {
    const { clientLog, dtLog, diffSummary } = await req.json();

    if (!clientLog && !dtLog) {
      return NextResponse.json({ error: "No log content provided" }, { status: 400 });
    }

    const prompt = `You are Codex acting as a senior code investigator. Compare these client-side and Dynatrace logs, then infer the most likely code paths, handlers, middleware, configuration, or deployment changes to inspect.

Focus on:
- likely source-code areas to inspect
- missing instrumentation or logging gaps
- request/trace correlation issues
- code paths that could explain mismatched status, latency, errors, or missing lines
- concrete debugging steps an engineer can run next

CLIENT SIDE LOG:
${clientLog || "(empty)"}

DYNATRACE LOG:
${dtLog || "(empty)"}

DIFF SUMMARY (up to 80 changed lines):
${diffSummary || "(none)"}

Respond with ONLY a raw JSON object. Do not use markdown, backticks, or prose outside JSON. Use this exact schema:
{
  "verdict": "pass" or "fail",
  "summary": "2-3 sentence plain-English code-investigation summary",
  "issues": [
    {
      "lineClient": "line number as string or null",
      "lineDynatrace": "line number as string or null",
      "source": "client" or "dynatrace" or "both",
      "severity": "high" or "medium" or "low",
      "title": "short code investigation title",
      "description": "what code/config behavior likely caused this and why it matters",
      "fix": "specific code area, file type, handler, middleware, config, query, or test to inspect next"
    }
  ]
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CODEX_MODEL || "gpt-4o",
        max_tokens: 1000,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: body?.error?.message || `OpenAI returned HTTP ${response.status}` },
        { status: response.status }
      );
    }

    const raw = body?.choices?.[0]?.message?.content?.trim() ?? "";
    try {
      return NextResponse.json(JSON.parse(raw));
    } catch {
      return NextResponse.json(
        { error: `Failed to parse Codex response: ${raw.slice(0, 200)}` },
        { status: 502 }
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
