import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { executeDql } from "@/lib/dynatrace";

const TIMEFRAMES = new Set(["-30m", "-1h", "-6h", "-24h"]);

function dqlString(value: string) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function recordsFromResult(result: unknown): Record<string, unknown>[] {
  if (!result || typeof result !== "object") return [];
  const direct = (result as { records?: unknown }).records;
  if (Array.isArray(direct)) return direct as Record<string, unknown>[];
  const nested = (result as { result?: { records?: unknown } }).result?.records;
  if (Array.isArray(nested)) return nested as Record<string, unknown>[];
  return [];
}

function buildTraceQuery(input: {
  from: string;
  endpointMode: string;
  service: string;
  search: string;
  traceId: string;
}) {
  const filters: string[] = ["isNotNull(`trace.id`)"];

  if (input.traceId) {
    filters.push(`\`trace.id\` == ${dqlString(input.traceId)}`);
  } else {
    filters.push("`span.kind` == \"server\"");
    if (input.endpointMode === "exclude-health") {
      filters.push("(`endpoint.name` != \"/actuator/health\" or isNull(`endpoint.name`))");
    }
  }

  if (input.service) {
    filters.push(`matchesPhrase(\`service.name\`, ${dqlString(input.service)})`);
  }

  if (input.search) {
    const search = dqlString(input.search);
    filters.push(
      `(matchesPhrase(\`endpoint.name\`, ${search}) or matchesPhrase(\`span.name\`, ${search}) or matchesPhrase(\`service.name\`, ${search}))`
    );
  }

  return `fetch spans, from: ${input.from}
| filter ${filters.join("\n| filter ")}
| sort timestamp ${input.traceId ? "asc" : "desc"}
| fields timestamp, \`trace.id\`, \`span.id\`, \`parent.id\`, \`span.name\`, \`span.kind\`, \`endpoint.name\`, \`service.name\`, duration, \`request.is_failed\`, \`http.request.method\`, \`http.response.status_code\`, \`url.path\`, \`k8s.workload.name\`, \`k8s.namespace.name\`, \`dt.entity.service\`, \`dt.entity.process_group\`, \`network.peer.address\`, \`network.peer.port\`
| limit ${input.traceId ? 300 : 500}`;
}

export async function GET(req: NextRequest) {
  if (!getSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fromParam = req.nextUrl.searchParams.get("from") ?? "-30m";
  const from = TIMEFRAMES.has(fromParam) ? fromParam : "-30m";
  const endpointMode = req.nextUrl.searchParams.get("endpointMode") ?? "exclude-health";
  const service = req.nextUrl.searchParams.get("service")?.trim() ?? "";
  const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";
  const traceId = req.nextUrl.searchParams.get("traceId")?.trim() ?? "";
  const query = buildTraceQuery({ from, endpointMode, service, search, traceId });

  try {
    const result = await executeDql(query, from, "now");
    return NextResponse.json({
      query,
      records: recordsFromResult(result),
      raw: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        query,
        error: error instanceof Error ? error.message : "Failed to fetch trace data",
      },
      { status: 500 }
    );
  }
}
