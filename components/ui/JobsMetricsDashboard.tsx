"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BriefcaseBusiness, RefreshCw } from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type JobPoint = { timeframe: string; status: string; count: number };
type JobsResponse = {
  from: string;
  query: string;
  points?: JobPoint[];
  totals?: Record<string, number>;
  samples?: Record<string, unknown>[];
  error?: string;
};

const COLORS: Record<string, string> = {
  COMPLETED: "#4f6dd6",
  FAILED: "#4b4d61",
  UNKNOWN: "#8b5cf6",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function compactDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function useJobsMetrics(from: string, refreshToken: number) {
  const [data, setData] = useState<JobsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/dynatrace/jobs-metrics?from=${encodeURIComponent(from)}&refresh=${refreshToken}`, {
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((json: JobsResponse) => setData(json))
      .catch((error: Error) => {
        if (error.name !== "AbortError") {
          setData({ from, query: "", error: error.message });
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [from, refreshToken]);

  return { data, loading };
}

function Stat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "bad" }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#111827] p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${tone === "bad" ? "text-red-300" : "text-white"}`}>
        {formatNumber(value)}
      </p>
    </div>
  );
}

function buildSeries(points: JobPoint[]) {
  const byDate = new Map<string, Record<string, string | number>>();
  points.forEach((point) => {
    const row = byDate.get(point.timeframe) ?? { timeframe: point.timeframe, label: compactDate(point.timeframe) };
    row[point.status] = (Number(row[point.status] ?? 0) || 0) + point.count;
    byDate.set(point.timeframe, row);
  });
  return Array.from(byDate.values()).sort((a, b) => String(a.timeframe).localeCompare(String(b.timeframe)));
}

export default function JobsMetricsDashboard() {
  const [from, setFrom] = useState("-7d");
  const [refreshToken, setRefreshToken] = useState(0);
  const { data, loading } = useJobsMetrics(from, refreshToken);

  const totals = data?.totals ?? {};
  const points = data?.points ?? [];
  const statuses = useMemo(() => Object.keys(totals).sort(), [totals]);
  const pieData = statuses.map((status) => ({ name: status, value: totals[status] ?? 0 }));
  const series = useMemo(() => buildSeries(points), [points]);
  const totalJobs = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const failedJobs = totals.FAILED ?? 0;
  const completedJobs = totals.COMPLETED ?? 0;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#818cf8]">Dynatrace dashboard copy</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Jobs Metrics</h1>
            <p className="mt-1 text-sm text-slate-400">
              Completed and failed service maintenance jobs, modeled after your Dynatrace dashboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-10 rounded-md border border-white/10 bg-[#111827] px-3 text-sm text-white outline-none"
            >
              <option value="-2h">Last 2 hours</option>
              <option value="-24h">Last 24 hours</option>
              <option value="-7d">Last 7 days</option>
              <option value="-30d">Last 30 days</option>
            </select>
            <button
              onClick={() => setRefreshToken((value) => value + 1)}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 bg-[#111827] px-3 text-sm text-slate-200 transition hover:border-[#818cf8]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {data?.error ? (
          <section className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Jobs Metrics needs the Dynatrace Platform/Grail token or a custom jobs DQL.</p>
                <p className="mt-1 text-amber-100/80">{data.error}</p>
                <pre className="mt-3 max-h-44 overflow-auto rounded-md border border-amber-500/20 bg-black/30 p-3 text-xs text-amber-50/80">
                  {data.query}
                </pre>
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Completed" value={completedJobs} />
          <Stat label="Failed" value={failedJobs} tone={failedJobs > 0 ? "bad" : "default"} />
          <Stat label="Total jobs" value={totalJobs} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.4fr]">
          <section className="rounded-md border border-white/10 bg-[#111827] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Jobs Metrics</h2>
              <BriefcaseBusiness className="h-4 w-4 text-slate-500" />
            </div>
            <div className="h-80">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading...</div>
              ) : pieData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">No job status data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={0} outerRadius={115} stroke="none">
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={COLORS[entry.name] ?? COLORS.UNKNOWN} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-slate-400">
              {pieData.map((entry) => (
                <span key={entry.name} className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[entry.name] ?? COLORS.UNKNOWN }} />
                  {entry.name}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-white/10 bg-[#111827] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Jobs Metrics</h2>
              <p className="text-xs text-slate-500">{from.replace("-", "Last ")}</p>
            </div>
            <div className="h-80">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading...</div>
              ) : series.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">No timeseries data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6 }}
                    />
                    {statuses.map((status) => (
                      <Line
                        key={status}
                        type="stepAfter"
                        dataKey={status}
                        stroke={COLORS[status] ?? COLORS.UNKNOWN}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-md border border-white/10 bg-[#111827]">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Raw job records</h2>
            <p className="mt-1 text-xs text-slate-500">Sample records returned by the jobs query.</p>
          </div>
          <div className="max-h-96 overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 bg-[#172033] text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-semibold">Record</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {(data?.samples ?? []).map((record, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">
                      <pre className="whitespace-pre-wrap break-all font-mono text-xs text-slate-300">
                        {JSON.stringify(record, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))}
                {!loading && (data?.samples ?? []).length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-slate-500">No raw records returned.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
