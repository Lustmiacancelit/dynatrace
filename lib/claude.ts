// lib/claude.ts
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DQL_SYSTEM_PROMPT = `You are an expert in Dynatrace Query Language (DQL) for Grail.
You help users build DQL queries through conversation. Remember context from previous messages.
When given a screenshot of Dynatrace logs or queries, analyze it and generate the appropriate DQL.

STRICT DQL RULES:
- Always start with: fetch logs, fetch metrics, fetch events, or fetch spans
- Timeframe: use from: -1h or from: -30m or from: -24h INSIDE the fetch statement
- Filter syntax: | filter status == "ERROR"
- String contains: | filter matchesPhrase(content, "502")
- Multiple conditions: | filter status == "ERROR" and matchesPhrase(content, "502")
- OR conditions: | filter status == "ERROR" or status == "WARN"
- Sorting: | sort timestamp desc
- Limiting: | limit 100
- Summarize: | summarize count(), by:{status}
- Time bins: | makeTimeseries count(), interval:5m

CORRECT EXAMPLES:
fetch logs, from: -1h
| filter status == "ERROR"
| sort timestamp desc
| limit 100

fetch logs, from: -30m
| filter matchesPhrase(content, "502")
| sort timestamp desc
| limit 100

fetch logs, from: -1h
| filter status == "ERROR" and matchesPhrase(content, "NullPointerException")
| summarize count(), by:{dt.process.name}
| sort count desc

fetch metrics, from: -30m
| filter dt.name == "builtin:host.cpu.usage"
| summarize avg(value), by:{dt.entity.host}

NEVER use: toTimestamp(), contains(), matchesValue() for strings, hardcoded timestamps, or SQL-style WHERE clauses.
NEVER add backticks or markdown.

When analyzing a screenshot:
1. Identify what data is shown (logs, metrics, traces, etc.)
2. Note any visible filters, time ranges, or field names
3. Generate the DQL query that would reproduce or improve that view

Respond in this exact JSON format (no other text):
{"message": "Brief explanation of what the query does", "dql": "the raw DQL query here"}`;

interface ChatMessage {
  role: "user" | "assistant";
  content: MessageParam["content"];
}

interface ImageInput {
  base64: string;
  mediaType: string;
}

type ValidMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function normalizeMediaType(mediaType: string): ValidMediaType {
  const valid: ValidMediaType[] = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (valid.includes(mediaType as ValidMediaType)) {
    return mediaType as ValidMediaType;
  }
  // Common fallbacks
  if (mediaType.includes("jpg") || mediaType.includes("jpeg")) return "image/jpeg";
  if (mediaType.includes("gif")) return "image/gif";
  if (mediaType.includes("webp")) return "image/webp";
  return "image/png"; // default fallback
}

export async function generateDqlWithClaude(
  prompt: string,
  history: ChatMessage[] = [],
  image: ImageInput | null = null
): Promise<{ dql: string; message: string }> {

  let currentContent: MessageParam["content"];

  if (image) {
    currentContent = [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: normalizeMediaType(image.mediaType),
          data: image.base64,
        },
      },
      { type: "text", text: prompt || "What DQL query should I use based on this screenshot?" },
    ];
  } else {
    currentContent = prompt;
  }

  const messages: MessageParam[] = [
    ...history,
    { role: "user" as const, content: currentContent },
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: DQL_SYSTEM_PROMPT,
    messages,
  });

  const text = (response.content[0] as { text: string }).text.trim();

  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      dql: parsed.dql || "",
      message: parsed.message || "Here's the DQL query for that:",
    };
  } catch {
    return {
      dql: text.replace(/```[a-z]*/gi, "").replace(/```/g, "").trim(),
      message: "Here's the DQL query for that:",
    };
  }
}

export async function explainDqlWithClaude(dqlQuery: string): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Explain this Dynatrace DQL query in plain English. Be concise (2-3 sentences max). What data does it fetch and what does it show?\n\nQuery:\n${dqlQuery}`,
      },
    ],
  });

  return (message.content[0] as { text: string }).text;
}
