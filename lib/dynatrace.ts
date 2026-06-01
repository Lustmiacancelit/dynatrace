const DT_URL = process.env.DYNATRACE_ENV_URL;
const DT_TOKEN = process.env.DYNATRACE_TOKEN;
const DT_PLATFORM_TOKEN = process.env.DYNATRACE_PLATFORM_TOKEN;

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
      dimensions?: string[];
      dimensionMap?: Record<string, string>;
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

export type DqlExecuteResponse = {
  records?: Record<string, unknown>[];
  result?: {
    records?: Record<string, unknown>[];
    [key: string]: unknown;
  };
  state?: string;
  requestToken?: string;
  [key: string]: unknown;
};

// ─── v2 API helpers ────────────────────────────────────────────────────────

export const getMetrics = (
  metricSelector: string,
  from = "now-1h",
  resolution?: string
): Promise<MetricsResponse> =>
  dtFetch("metrics/query", { metricSelector, from, resolution });

export const queryMetrics = (
  metricSelector: string,
  params?: {
    from?: string;
    resolution?: string;
    entitySelector?: string;
  }
): Promise<MetricsResponse> =>
  dtFetch("metrics/query", {
    metricSelector,
    from: params?.from ?? "now-1h",
    resolution: params?.resolution,
    entitySelector: params?.entitySelector,
  });

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
): Promise<DqlExecuteResponse> {
  if (!DT_PLATFORM_TOKEN) {
    throw new Error(
      "FlowLog can run this inside the app after you add DYNATRACE_PLATFORM_TOKEN with Grail DQL permissions. The current classic token can read metrics/entities/problems, but it cannot execute Grail DQL or read logs."
    );
  }

  const environmentId = DT_URL?.replace(/^https:\/\//, "").replace(/\.live\.dynatrace\.com$/, "");
  if (!environmentId) throw new Error("DYNATRACE_ENV_URL is not configured.");

  const res = await fetch(
    `https://${environmentId}.apps.dynatrace.com/platform/storage/query/v1/query:execute?request-timeout=30s&enrich=metric-metadata`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DT_PLATFORM_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        defaultTimeframeStart: timeframeStart,
        defaultTimeframeEnd: timeframeEnd,
        fetchTimeoutSeconds: 30,
        requestTimeoutMilliseconds: 30000,
        maxResultRecords: 1000,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Dynatrace rejected the in-app DQL execution (${res.status}). Add a Dynatrace Platform/OAuth bearer token with Grail permissions such as storage:buckets:read and storage:logs:read. Details: ${err}`
      );
    }
    throw new Error(`Dynatrace DQL execution failed (${res.status}): ${err}`);
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
