"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ExternalLink, Globe2, ListTree, RefreshCw, Search, Timer } from "lucide-react";

type TraceRecord = Record<string, unknown>;

function text(record: TraceRecord | null, key: string) {
  if (!record) return "";
  const value = record[key];
  if (value === null || value === undefined) return "";
  return String(value);
}

function numericDuration(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const match = value.match(/([\d.]+)/);
  const amount = match ? Number(match[1]) : 0;
  if (value.includes("µs")) return amount / 1000;
  if (value.includes("ns")) return amount / 1000000;
  if (value.includes("s") && !value.includes("ms")) return amount * 1000;
  return amount;
}

function formatDuration(value: unknown) {
  const ms = numericDuration(value);
  if (!ms) return "null";
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  return `${ms.toFixed(2)} ms`;
}

function formatTime(value: unknown) {
  if (!value) return "null";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function statusClass(record: TraceRecord) {
  const failed = text(record, "request.is_failed").toLowerCase();
  const code = Number(text(record, "http.response.status_code"));
  if (failed === "true" || code >= 500) return "border-red-500/30 bg-red-500/10 text-red-300";
  if (code >= 400) return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
}

function requestLabel(record: TraceRecord) {
  return (
    text(record, "endpoint.name") ||
    text(record, "url.path") ||
    text(record, "span.name") ||
    text(record, "trace.id") ||
    "Unknown request"
  );
}

function getTraceId(record: TraceRecord | null) {
  return text(record, "trace.id");
}

function endpointName(record: TraceRecord) {
  return text(record, "endpoint.name") || text(record, "url.path") || text(record, "span.name") || "Unknown endpoint";
}

function groupCount(records: TraceRecord[], getKey: (record: TraceRecord) => string) {
  const counts = new Map<string, number>();
  records.forEach((record) => {
    const key = getKey(record);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function buildTrend(records: TraceRecord[]) {
  const counts = new Map<string, { label: string; total: number; failed: number; duration: number; durationCount: number }>();

  records.forEach((record) => {
    const timestamp = new Date(String(record.timestamp));
    if (Number.isNaN(timestamp.getTime())) return;
    timestamp.setMinutes(0, 0, 0);
    const key = timestamp.toISOString();
    const existing = counts.get(key) ?? {
      label: timestamp.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit" }),
      total: 0,
      failed: 0,
      duration: 0,
      durationCount: 0,
    };
    existing.total += 1;
    if (text(record, "request.is_failed") === "true") existing.failed += 1;
    const duration = numericDuration(record.duration);
    if (duration) {
      existing.duration += duration;
      existing.durationCount += 1;
    }
    counts.set(key, existing);
  });

  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => ({
      ...value,
      average: value.durationCount ? value.duration / value.durationCount : 0,
    }));
}

function useTraceData(params: URLSearchParams) {
  const [records, setRecords] = useState<TraceRecord[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const key = params.toString();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    fetch(`/api/dynatrace/traces?${key}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((json) => {
        setQuery(json.query ?? "");
        if (json.error) {
          setError(json.error);
          setRecords([]);
          return;
        }
        setRecords(Array.isArray(json.records) ? json.records : []);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [key]);

  return { records, query, error, loading };
}

function RequestTrend({ records }: { records: TraceRecord[] }) {
  const trend = buildTrend(records);
  const maxCount = Math.max(...trend.map((item) => item.total), 1);
  const maxDuration = Math.max(...trend.map((item) => item.average), 1);

  return (
    <section className="rounded-md border border-white/10 bg-[#111827] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Requests</h2>
          <p className="mt-1 text-xs text-slate-500">Trace count and average response time by hour</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#818cf8]" />Trace count</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#5bc0b3]" />Average</span>
        </div>
      </div>
      {trend.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-slate-500">No trend data</div>
      ) : (
        <div className="grid h-40 grid-flow-col items-end gap-2 overflow-x-auto border-b border-l border-white/10 px-3 pb-6">
          {trend.map((item) => (
            <div key={item.label} className="flex min-w-12 flex-col items-center justify-end gap-1">
              <div className="relative flex h-28 w-full items-end justify-center">
                <div
                  className="w-3 rounded-t bg-[#818cf8]/70"
                  title={`${item.total} requests`}
                  style={{ height: `${Math.max((item.total / maxCount) * 100, 4)}%` }}
                />
                <div
                  className="absolute bottom-0 h-1 w-7 rounded bg-[#5bc0b3]"
                  title={`${item.average.toFixed(2)} ms avg`}
                  style={{ bottom: `${Math.min((item.average / maxDuration) * 100, 100)}%` }}
                />
              </div>
              <span className="whitespace-nowrap text-[10px] text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FacetPanel({
  records,
  endpoint,
  onEndpointSelect,
}: {
  records: TraceRecord[];
  endpoint: string;
  onEndpointSelect: (value: string) => void;
}) {
  const endpoints = groupCount(records, endpointName).slice(0, 18);
  const services = groupCount(records, (record) => text(record, "service.name") || "Unknown service").slice(0, 10);

  return (
    <aside className="space-y-3 rounded-md border border-white/10 bg-[#111827] p-3">
      <div className="rounded-md bg-[#172033] px-3 py-2">
        <p className="text-sm font-semibold text-white">Requests</p>
        <p className="text-xs text-slate-500">Facet filters</p>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Endpoint</p>
        <div className="max-h-[420px] space-y-1 overflow-auto">
          {endpoints.map((item) => (
            <button
              key={item.name}
              onClick={() => onEndpointSelect(item.name)}
              className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition ${
                endpoint === item.name
                  ? "border-[#818cf8] bg-[#6366f1]/15 text-white"
                  : "border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/[0.03]"
              }`}
            >
              <span className="h-3.5 w-3.5 rounded border border-slate-500" />
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              <span className="font-mono text-slate-500">{item.count}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Service</p>
        <div className="space-y-1">
          {services.map((item) => (
            <div key={item.name} className="flex items-center gap-2 rounded-md border border-white/10 px-2 py-1.5 text-xs">
              <span className="min-w-0 flex-1 truncate text-slate-300">{item.name}</span>
              <span className="font-mono text-slate-500">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function TraceWaterfall({ spans, selected }: { spans: TraceRecord[]; selected: TraceRecord | null }) {
  const maxDuration = Math.max(...spans.map((span) => numericDuration(span.duration)), 1);

  return (
    <section className="overflow-hidden rounded-md border border-white/10 bg-[#111827]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Trace waterfall</h3>
          <p className="mt-1 text-xs text-slate-500">{spans.length} spans in selected trace</p>
        </div>
        <ListTree className="h-4 w-4 text-slate-500" />
      </div>
      <div className="max-h-[360px] overflow-auto p-3">
        {spans.length === 0 ? (
          <div className="rounded-md border border-white/10 bg-black/20 p-6 text-center text-sm text-slate-500">
            Select a request to load its spans.
          </div>
        ) : (
          <div className="space-y-2">
            {spans.map((span, index) => {
              const duration = numericDuration(span.duration);
              const width = Math.max((duration / maxDuration) * 100, 4);
              const active = selected && text(selected, "span.id") === text(span, "span.id");
              return (
                <div
                  key={`${text(span, "span.id")}-${index}`}
                  className={`grid grid-cols-[240px_1fr_84px] items-center gap-3 rounded-md border px-3 py-2 text-xs ${
                    active ? "border-[#818cf8] bg-[#6366f1]/10" : "border-white/10 bg-black/10"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-100">{text(span, "span.name") || requestLabel(span)}</p>
                    <p className="truncate text-[10px] text-slate-500">{text(span, "service.name") || text(span, "span.kind")}</p>
                  </div>
                  <div className="h-5 rounded bg-white/5">
                    <div
                      className="h-5 rounded bg-[#6d5dfc]"
                      style={{ width: `${width}%`, marginLeft: `${Math.min(index * 2, 24)}px` }}
                    />
                  </div>
                  <p className="text-right font-mono text-slate-300">{formatDuration(span.duration)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function TraceDetails({ record }: { record: TraceRecord | null }) {
  const rows = [
    ["Endpoint", text(record, "endpoint.name") || text(record, "url.path")],
    ["Span kind", text(record, "span.kind")],
    ["Span name", text(record, "span.name")],
    ["Service", text(record, "service.name")],
    ["Duration", formatDuration(record?.duration)],
    ["HTTP method", text(record, "http.request.method")],
    ["HTTP status", text(record, "http.response.status_code")],
    ["Trace ID", text(record, "trace.id")],
    ["Span ID", text(record, "span.id")],
    ["Kubernetes workload", text(record, "k8s.workload.name")],
    ["Kubernetes namespace", text(record, "k8s.namespace.name")],
    ["Network peer", text(record, "network.peer.address")],
  ].filter(([, value]) => value && value !== "null");

  return (
    <section className="overflow-hidden rounded-md border border-white/10 bg-[#111827]">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
          <Globe2 className="h-5 w-5 text-[#a78bfa]" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white">{record ? requestLabel(record) : "No request selected"}</h3>
          <p className="truncate text-xs text-slate-500">{text(record, "service.name") || "Select a row to inspect attributes"}</p>
        </div>
      </div>
      <div className="max-h-[360px] overflow-auto p-4">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">Trace attributes will appear here.</p>
        ) : (
          <dl className="space-y-2">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[140px_1fr] gap-3 border-b border-white/5 pb-2 text-xs">
                <dt className="text-slate-500">{label}</dt>
                <dd className="break-all font-mono text-slate-200">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

export default function TraceExplorer() {
  const [from, setFrom] = useState("-30m");
  const [endpointMode, setEndpointMode] = useState("exclude-health");
  const [endpoint, setEndpoint] = useState("");
  const [requestState, setRequestState] = useState("all");
  const [service, setService] = useState("");
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<TraceRecord | null>(null);

  const listParams = useMemo(() => {
    const params = new URLSearchParams({ from, endpointMode, refresh: String(refreshToken) });
    if (endpointMode === "exact" && endpoint.trim()) params.set("endpoint", endpoint.trim());
    if (requestState !== "all") params.set("requestState", requestState);
    if (service.trim()) params.set("service", service.trim());
    if (activeSearch.trim()) params.set("search", activeSearch.trim());
    return params;
  }, [activeSearch, endpoint, endpointMode, from, refreshToken, requestState, service]);

  const traceParams = useMemo(() => {
    const params = new URLSearchParams({ from, endpointMode, refresh: String(refreshToken) });
    const traceId = getTraceId(selectedRequest);
    if (traceId) params.set("traceId", traceId);
    return params;
  }, [endpointMode, from, refreshToken, selectedRequest]);

  const requests = useTraceData(listParams);
  const trace = useTraceData(traceParams);

  useEffect(() => {
    setSelectedRequest(null);
  }, [activeSearch, endpoint, endpointMode, from, requestState, service]);

  const selectedTraceId = getTraceId(selectedRequest);
  const selectedSpan =
    trace.records.find((span) => text(span, "span.id") === text(selectedRequest, "span.id")) ??
    trace.records[0] ??
    selectedRequest;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#818cf8]">Dynatrace distributed tracing</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Trace Explorer</h1>
            <p className="mt-1 text-sm text-slate-400">Requests, spans, timing, and Kubernetes context from Grail spans.</p>
          </div>
          <button
            onClick={() => setRefreshToken((value) => value + 1)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-[#111827] px-3 text-sm text-slate-200 transition hover:border-[#818cf8]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <section className="rounded-md border border-white/10 bg-[#111827] p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px_180px_auto]">
            <label className="flex h-11 min-w-0 items-center gap-2 rounded-md border border-white/10 bg-[#0b1117] px-3">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") setActiveSearch(search);
                }}
                placeholder="Search endpoint, service, or span..."
                className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
              />
            </label>
            <input
              value={service}
              onChange={(event) => setService(event.target.value)}
              placeholder="Service filter"
              className="h-11 rounded-md border border-white/10 bg-[#0b1117] px-3 text-sm text-white placeholder:text-slate-600 outline-none"
            />
            <select
              value={endpointMode}
              onChange={(event) => setEndpointMode(event.target.value)}
              className="h-11 rounded-md border border-white/10 bg-[#0b1117] px-3 text-sm text-white outline-none"
            >
              <option value="exclude-health">Endpoint != /actuator/health</option>
              <option value="exact">Endpoint = exact value</option>
              <option value="all">All endpoints</option>
            </select>
            <select
              value={requestState}
              onChange={(event) => setRequestState(event.target.value)}
              className="h-11 rounded-md border border-white/10 bg-[#0b1117] px-3 text-sm text-white outline-none"
            >
              <option value="all">All requests</option>
              <option value="failed">Only failed</option>
              <option value="successful">Only successful</option>
            </select>
            <select
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-11 rounded-md border border-white/10 bg-[#0b1117] px-3 text-sm text-white outline-none"
            >
              <option value="-30m">Last 30 minutes</option>
              <option value="-1h">Last 1 hour</option>
              <option value="-6h">Last 6 hours</option>
              <option value="-24h">Last 24 hours</option>
            </select>
            <button
              onClick={() => setActiveSearch(search)}
              className="h-11 rounded-md bg-[#6366f1] px-4 text-sm font-semibold text-white transition hover:bg-[#818cf8]"
            >
              Search
            </button>
          </div>
          {endpointMode === "exact" ? (
            <input
              value={endpoint}
              onChange={(event) => setEndpoint(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") setActiveSearch(search);
              }}
              placeholder='Exact endpoint, for example https://api.ibkr.com/oauth2/api/v1/token'
              className="mt-3 h-11 w-full rounded-md border border-white/10 bg-[#0b1117] px-3 font-mono text-sm text-white placeholder:text-slate-600 outline-none"
            />
          ) : null}
        </section>

        {requests.error ? (
          <section className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Trace data needs a Dynatrace Platform/Grail token.</p>
                <p className="mt-1 text-amber-100/80">{requests.error}</p>
                <pre className="mt-3 max-h-40 overflow-auto rounded-md border border-amber-500/20 bg-black/30 p-3 text-xs text-amber-50/80">
                  {requests.query}
                </pre>
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[260px_1fr]">
          <FacetPanel
            records={requests.records}
            endpoint={endpoint}
            onEndpointSelect={(value) => {
              setEndpoint(value);
              setEndpointMode("exact");
              setActiveSearch(search);
            }}
          />
          <div className="space-y-5">
            <RequestTrend records={requests.records} />
            <section className="overflow-hidden rounded-md border border-white/10 bg-[#111827]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">Most recent traces</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {requests.loading ? "Loading..." : `${requests.records.length} requests`}
                  </p>
                </div>
                <Timer className="h-4 w-4 text-slate-500" />
              </div>
              <div className="max-h-[320px] overflow-auto">
                <table className="w-full min-w-[1120px] text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-[#172033] text-slate-400">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Start time</th>
                      <th className="px-4 py-2 font-semibold">Endpoint</th>
                      <th className="px-4 py-2 font-semibold">Service</th>
                      <th className="px-4 py-2 font-semibold">Duration</th>
                      <th className="px-4 py-2 font-semibold">Request</th>
                      <th className="px-4 py-2 font-semibold">HTTP</th>
                      <th className="px-4 py-2 font-semibold">Process group</th>
                      <th className="px-4 py-2 font-semibold">Kubernetes workload</th>
                      <th className="px-4 py-2 font-semibold">Namespace</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-slate-100">
                    {requests.records.map((record, index) => {
                      const active = selectedTraceId && selectedTraceId === getTraceId(record);
                      return (
                        <tr
                          key={`${getTraceId(record)}-${text(record, "span.id")}-${index}`}
                          onClick={() => setSelectedRequest(record)}
                          className={`cursor-pointer transition hover:bg-white/[0.04] ${active ? "bg-[#6366f1]/10" : ""}`}
                        >
                          <td className="px-4 py-2 font-mono text-xs">{formatTime(record.timestamp)}</td>
                          <td className="max-w-[260px] px-4 py-2"><p className="truncate">{requestLabel(record)}</p></td>
                          <td className="max-w-[220px] px-4 py-2"><p className="truncate">{text(record, "service.name") || "null"}</p></td>
                          <td className="px-4 py-2 font-mono">{formatDuration(record.duration)}</td>
                          <td className="px-4 py-2">
                            <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${statusClass(record)}`}>
                              {text(record, "request.is_failed") === "true" ? "Failed" : "Success"}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-mono">{text(record, "http.response.status_code") || "null"}</td>
                          <td className="max-w-[220px] px-4 py-2"><p className="truncate">{text(record, "dt.entity.process_group") || "null"}</p></td>
                          <td className="max-w-[220px] px-4 py-2"><p className="truncate">{text(record, "k8s.workload.name") || "null"}</p></td>
                          <td className="px-4 py-2 font-mono">{text(record, "k8s.namespace.name") || "null"}</td>
                        </tr>
                      );
                    })}
                    {!requests.loading && requests.records.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500">
                          No trace requests returned for this filter.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <TraceWaterfall spans={trace.records} selected={selectedSpan} />
          <TraceDetails record={selectedSpan} />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>Powered by DQL: fetch spans</span>
          {selectedTraceId ? <span className="font-mono">trace.id={selectedTraceId}</span> : null}
          <a
            className="inline-flex items-center gap-1 text-[#93c5fd] hover:text-white"
            href="https://docs.dynatrace.com/docs/observe/application-observability/distributed-tracing/distributed-tracing-app"
            target="_blank"
            rel="noreferrer"
          >
            Dynatrace tracing docs <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
