"use client";
import { useState } from "react";
import LogsTable from "@/components/ui/LogsTable";
import { Search } from "lucide-react";

const PRESETS = [
  { label: "All", query: "" },
  { label: "Errors", query: "status:error" },
  { label: "Warnings", query: "status:warn" },
  { label: "K8s", query: "dt.source.entity.type:cloud_application_namespace" },
];

export default function LogsPage() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [limit, setLimit] = useState(100);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#6366f1]">FlowLog Observability</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Logs</h1>
          <p className="mt-1 text-sm text-slate-400">Search and filter log events from your environment</p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-[#1e293b] px-4 py-2.5">
            <Search className="h-4 w-4 flex-shrink-0 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setActiveQuery(query)}
              placeholder='Filter logs — e.g. status:error, "timeout"'
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none"
            />
          </div>
          <button
            onClick={() => setActiveQuery(query)}
            className="rounded-xl bg-[#6366f1] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#818cf8]"
          >
            Search
          </button>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => { setQuery(p.query); setActiveQuery(p.query); }}
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                activeQuery === p.query
                  ? "border-[#6366f1] bg-[#6366f1]/10 text-[#818cf8]"
                  : "border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-[#1e293b] px-3 py-1.5 text-xs text-slate-400 outline-none"
          >
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
            <option value={200}>200 rows</option>
          </select>
        </div>

        <LogsTable query={activeQuery} limit={limit} title={`Logs${activeQuery ? ` · "${activeQuery}"` : ""}`} />
      </div>
    </div>
  );
}
