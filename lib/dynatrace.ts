const DT_URL = process.env.DYNATRACE_ENV_URL;
const DT_TOKEN = process.env.DYNATRACE_TOKEN;

if (!DT_URL || !DT_TOKEN) {
  console.warn("⚠️  DYNATRACE_ENV_URL or DYNATRACE_TOKEN not set in .env.local");
}

const dtHeaders = {
  Authorization: `Api-Token ${DT_TOKEN}`,
  "Content-Type": "application/json",
};

async function dtFetch(path: string, params?: Record<string, string | undefined>) {
  const url = new URL(`${DT_URL}/api/v2/${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
  }
  const res = await fetch(url.toString(), {
    headers: dtHeaders,
    next: { revalidate: 30 },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Dynatrace API error (${res.status}): ${err}`);
  }
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────

export type MetricsResponse = {
  resolution: string;
  result: Array<{
    metricId: string;
    data: Array<{
      timestamps: number[];
      values: (number | null)[];
    }>;
  }>;
};

export type LogEntry = {
  timestamp: string;
  content: string;
  severity?: string;
  status?: string;
  [key: string]: unknown;
};

export type LogsResponse = {
  results: LogEntry[];
  totalCount: number;
};

export type Problem = {
  problemId: string;
  displayId: string;
  title: string;
  severityLevel: string;
  status: string;
  startTime: number;
  impactedEntities: Array<{ entityId: { id: string; type: string }; name: string }>;
};

export type ProblemsResponse = {
  totalCount: number;
  problems: Problem[];
};

export type Entity = {
  entityId: string;
  displayName: string;
  type: string;
};

export type EntitiesResponse = {
  totalCount: number;
  entities: Entity[];
};

// ─── v2 API helpers ────────────────────────────────────────────────────────

export const getMetrics = (
  metricSelector: string,
  from = "now-1h",
  resolution?: string
): Promise<MetricsResponse> =>
  dtFetch("metrics/query", { metricSelector, from, resolution });

export const getLogs = (
  query = "",
  from = "now-1h",
  limit = "100"
): Promise<LogsResponse> =>
  dtFetch("logs/search", { ...(query ? { query } : {}), from, limit });

export const getProblems = (): Promise<ProblemsResponse> =>
  dtFetch("problems", { problemSelector: "status(open)" });

export const getEntities = (type = "SERVICE"): Promise<EntitiesResponse> =>
  dtFetch("entities", { entitySelector: `type(${type})`, pageSize: "500" });

// ─── Natural Language → DQL ───────────────────────────────────────────────

export async function nlToDql(_prompt: string): Promise<string> {
  throw new Error("davis-copilot not available on classic token");
}

// ─── Execute DQL (logs search) ────────────────────────────────────────────

export async function executeDql(
  query: string,
  timeframeStart = "now-2h",
  timeframeEnd = "now"
) {
  const res = await fetch(
    `${DT_URL}/api/v2/logs/search?from=${encodeURIComponent(timeframeStart)}&to=${encodeURIComponent(timeframeEnd)}&query=${encodeURIComponent(query)}&limit=100`,
    { method: "GET", headers: dtHeaders }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DQL execution failed (${res.status}): ${err}`);
  }
  return res.json();
}

// ─── DQL → Plain English ─────────────────────────────────────────────────

export async function dqlToNl(dqlQuery: string): Promise<string> {
  const res = await fetch(`${DT_URL}/api/v2/davis/copilot/dql2nl`, {
    method: "POST",
    headers: dtHeaders,
    body: JSON.stringify({ dqlQuery }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Dynatrace DQL2NL failed (${res.status}): ${err}`);
  }
  const data = await res.json();
  return data.explanation ?? data.text ?? "";
}
