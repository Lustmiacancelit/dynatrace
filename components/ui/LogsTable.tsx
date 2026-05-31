"use client";
import { useEffect, useState } from "react";
import type { LogEntry } from "@/lib/dynatrace";

const LEVEL_STYLE: Record<string, string> = {
  ERROR: "text-red-400 bg-red-400/10",
  WARN: "text-yellow-400 bg-yellow-400/10",
  WARNING: "text-yellow-400 bg-yellow-400/10",
  INFO: "text-blue-400 bg-blue-400/10",
  DEBUG: "text-slate-400 bg-slate-400/10",
  NONE: "text-slate-500 bg-slate-500/10",
};

type Props = { limit?: number; query?: string; title?: string };

export default function LogsTable({ limit = 20, query = "", title = "Recent Logs" }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (query) params.set("query", query);
    fetch(`/api/dynatrace/logs?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) { setError(json.error); return; }
        setLogs(json.results ?? []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [limit, query]);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1e293b]">
      <div className="border-b border-white/10 px-5 py-3">
        <h3 className="text-sm font-medium text-slate-300">{title}</h3>
      </div>

      {loading ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-[#0f172a]" />
          ))}
        </div>
      ) : error ? (
        <div className="p-5 text-sm text-slate-500">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="px-5 py-2.5 font-medium text-slate-500">Time</th>
                <th className="px-5 py-2.5 font-medium text-slate-500">Level</th>
                <th className="px-5 py-2.5 font-medium text-slate-500">Content</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-slate-500">
                    No logs found
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => {
                  const raw = (log.severity || log.status || "NONE").toUpperCase();
                  const level = LEVEL_STYLE[raw] ? raw : "NONE";
                  return (
                    <tr key={i} className="border-b border-white/5 transition-colors hover:bg-white/[0.03]">
                      <td className="whitespace-nowrap px-5 py-2 font-mono text-slate-500">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "—"}
                      </td>
                      <td className="px-5 py-2">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${LEVEL_STYLE[level]}`}>
                          {level}
                        </span>
                      </td>
                      <td className="max-w-sm truncate px-5 py-2 text-slate-300">
                        {String(log.content ?? "—")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
