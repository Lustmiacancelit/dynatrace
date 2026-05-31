"use client";
import { useEffect, useState } from "react";
import type { Problem } from "@/lib/dynatrace";
import { AlertTriangle, AlertCircle, Zap, Activity } from "lucide-react";

const SEVERITY: Record<string, { label: string; cls: string; Icon: typeof AlertTriangle }> = {
  AVAILABILITY: { label: "Availability", cls: "text-red-400 bg-red-400/10 border-red-400/20", Icon: AlertTriangle },
  ERROR: { label: "Error", cls: "text-orange-400 bg-orange-400/10 border-orange-400/20", Icon: AlertCircle },
  PERFORMANCE: { label: "Performance", cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", Icon: Zap },
  RESOURCE_CONTENTION: { label: "Resource", cls: "text-blue-400 bg-blue-400/10 border-blue-400/20", Icon: Activity },
};

export default function ProblemsTable() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dynatrace/problems")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) { setError(json.error); return; }
        setProblems(json.problems ?? []);
        setTotal(json.totalCount ?? 0);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1e293b]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <h3 className="text-sm font-medium text-slate-300">Open Problems</h3>
        {!loading && !error && total > 0 && (
          <span className="rounded-full bg-red-400/15 px-2 py-0.5 text-xs font-semibold text-red-400">
            {total}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-[#0f172a]" />
          ))}
        </div>
      ) : error ? (
        <div className="p-5 text-sm text-slate-500">{error}</div>
      ) : problems.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-slate-500">
          <Activity className="h-8 w-8 opacity-30" />
          <p className="text-sm">No open problems</p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {problems.map((p) => {
            const sev = SEVERITY[p.severityLevel] ?? {
              label: p.severityLevel,
              cls: "text-slate-400 bg-slate-400/10 border-slate-400/20",
              Icon: AlertTriangle,
            };
            const { Icon } = sev;
            const startedAt = new Date(p.startTime).toLocaleString([], {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            });
            return (
              <li key={p.problemId} className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]">
                <span className={`mt-0.5 flex-shrink-0 rounded border p-1.5 ${sev.cls}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-200">{p.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {p.displayId} · {sev.label} · Started {startedAt}
                  </p>
                  {p.impactedEntities?.length > 0 && (
                    <p className="mt-1 truncate text-[11px] text-slate-600">
                      Impacted: {p.impactedEntities.map((e) => e.name).join(", ")}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
