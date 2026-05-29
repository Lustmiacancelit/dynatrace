// lib/dynatrace.ts
const DT_URL = process.env.DYNATRACE_ENV_URL;
const DT_TOKEN = process.env.DYNATRACE_TOKEN;

if (!DT_URL || !DT_TOKEN) {
  console.warn("⚠️  DYNATRACE_ENV_URL or DYNATRACE_TOKEN not set in .env.local");
}

const headers = {
  Authorization: `Api-Token ${DT_TOKEN}`,
  "Content-Type": "application/json",
};

// ─── Natural Language → DQL ───────────────────────────────────────────────
export async function nlToDql(prompt: string): Promise<string> {
  throw new Error("davis-copilot not available on classic token");
}

// ─── Execute DQL Query ────────────────────────────────────────────────────
export async function executeDql(
  query: string,
  timeframeStart = "now-2h",
  timeframeEnd = "now"
) {
  const res = await fetch(
    `${DT_URL}/api/v2/logs/search?from=${encodeURIComponent(timeframeStart)}&to=${encodeURIComponent(timeframeEnd)}&query=${encodeURIComponent(query)}&limit=100`,
    {
      method: "GET",
      headers,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DQL execution failed (${res.status}): ${err}`);
  }

  return res.json();
}

// ─── DQL → Plain English Explanation ────────────────────────────────────
export async function dqlToNl(dqlQuery: string): Promise<string> {
  const res = await fetch(`${DT_URL}/api/v2/davis/copilot/dql2nl`, {
    method: "POST",
    headers,
    body: JSON.stringify({ dqlQuery }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Dynatrace DQL2NL failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.explanation ?? data.text ?? "";
}