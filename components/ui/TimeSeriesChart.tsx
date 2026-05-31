"use client";
import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Point = { time: string; value: number };

type Props = {
  title: string;
  metric: string;
  type?: "line" | "area";
  color?: string;
  from?: string;
};

export default function TimeSeriesChart({
  title,
  metric,
  type = "line",
  color = "#6366f1",
  from = "now-1h",
}: Props) {
  const [data, setData] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch(
      `/api/dynatrace/metrics?selector=${encodeURIComponent(metric)}&from=${encodeURIComponent(from)}`
    )
      .then((r) => r.json())
      .then((json) => {
        if (json.error) { setError(json.error); return; }
        const series = json.result?.[0]?.data?.[0];
        if (!series?.timestamps?.length) { setError("No data"); return; }
        const points: Point[] = series.timestamps
          .map((ts: number, i: number) => ({
            time: new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            value: series.values[i] !== null ? Math.round(series.values[i] * 100) / 100 : null,
          }))
          .filter((d: { value: number | null }) => d.value !== null) as Point[];
        setData(points);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [metric, from]);

  return (
    <div className="rounded-xl border border-white/10 bg-[#1e293b] p-5">
      <h3 className="mb-4 text-sm font-medium text-slate-300">{title}</h3>

      {!mounted || loading ? (
        <div className="h-40 animate-pulse rounded-lg bg-[#0f172a]" />
      ) : error || !data.length ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-500">
          {error ?? "No data available"}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          {type === "area" ? (
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#94a3b8" }} />
              <Area type="monotone" dataKey="value" stroke={color} fill={`${color}25`} strokeWidth={2} dot={false} />
            </AreaChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#94a3b8" }} />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  );
}
