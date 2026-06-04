import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { executeDql } from "@/lib/dynatrace";

type JobRecord = Record<string, unknown>;

const TIMEFRAMES = new Set(["-2h", "-24h", "-7d", "-30d"]);

const DEFAULT_JOBS_DQL = `fetch spans, from: {from}
| filter matchesPhrase(\`service.name\`, "batch") or matchesPhrase(\`span.name\`, "job") or matchesPhrase(\`endpoint.name\`, "job")
| fields timestamp, status = if(\`request.is_failed\` == true, "FAILED", else: "COMPLETED"), service = \`service.name\`, endpoint = \`endpoint.name\`, duration, \`trace.id\`
| summarize count = count(), by: { status, timeframe = bin(timestamp, 1d) }
| sort timeframe asc`;

function recordsFromResult(result: unknown): JobRecord[] {
  if (!result || typeof result !== "object") return [];
  const direct = (result as { records?: unknown }).records;
  if (Array.isArray(direct)) return direct as JobRecord[];
  const nested = (result as { result?: { records?: unknown } }).result?.records;
  if (Array.isArray(nested)) return nested as JobRecord[];
  return [];
}

function firstValue(record: JobRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return null;
}

function normalizeStatus(value: unknown) {
  const raw = String(value ?? "UNKNOWN").trim().toUpperCase();
  if (["SUCCESS", "SUCCEEDED", "COMPLETE", "COMPLETED", "OK", "200"].includes(raw)) return "COMPLETED";
  if (["FAIL", "FAILED", "FAILURE", "ERROR", "ERRORED", "500"].includes(raw)) return "FAILED";
  return raw || "UNKNOWN";
}

function normalizeBucket(value: unknown) {
  if (!value) return "Unknown";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

function normalizeCount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return 1;
}

function normalizeRecords(records: JobRecord[]) {
  const grouped = new Map<string, { timeframe: string; status: string; count: number }>();
  const samples = records.slice(0, 100);

  records.forEach((record) => {
    const status = normalizeStatus(firstValue(record, ["status", "job.status", "state", "result", "execution.status"]));
    const timeframe = normalizeBucket(firstValue(record, ["timeframe", "timestamp", "start_time", "startTime", "event.time"]));
    const count = normalizeCount(firstValue(record, ["count", "count()", "value", "jobs", "total"]));
    const key = `${timeframe}::${status}`;
    const existing = grouped.get(key) ?? { timeframe, status, count: 0 };
    existing.count += count;
    grouped.set(key, existing);
  });

  const points = Array.from(grouped.values()).sort(
    (a, b) => a.timeframe.localeCompare(b.timeframe) || a.status.localeCompare(b.status)
  );
  const totals = points.reduce<Record<string, number>>((acc, point) => {
    acc[point.status] = (acc[point.status] ?? 0) + point.count;
    return acc;
  }, {});

  return { points, totals, samples };
}

export async function GET(req: NextRequest) {
  if (!getSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fromParam = req.nextUrl.searchParams.get("from") ?? "-7d";
  const from = TIMEFRAMES.has(fromParam) ? fromParam : "-7d";
  const queryTemplate = process.env.DYNATRACE_JOBS_DQL?.trim() || DEFAULT_JOBS_DQL;
  const query = queryTemplate.replaceAll("{from}", from);

  try {
    const result = await executeDql(query, from, "now");
    const records = recordsFromResult(result);
    return NextResponse.json({
      query,
      from,
      ...normalizeRecords(records),
    });
  } catch (error) {
    return NextResponse.json(
      {
        query,
        from,
        error: error instanceof Error ? error.message : "Failed to fetch jobs metrics",
      },
      { status: 500 }
    );
  }
}
