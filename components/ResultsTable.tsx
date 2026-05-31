"use client";
// components/ResultsTable.tsx

interface ResultsTableProps {
  results: Record<string, unknown> | null;
  error?: string;
}

function flattenResults(results: Record<string, unknown>): {
  columns: string[];
  rows: Record<string, unknown>[];
} {
  const grailRecords =
    (results.records as Record<string, unknown>[] | undefined) ??
    ((results.result as { records?: Record<string, unknown>[] } | undefined)?.records);
  if (Array.isArray(grailRecords)) {
    if (!grailRecords.length) return { columns: [], rows: [] };
    const columns = Array.from(
      grailRecords.reduce((set, row) => {
        Object.keys(row).forEach((key) => set.add(key));
        return set;
      }, new Set<string>())
    );
    return { columns, rows: grailRecords };
  }

  // Handle Dynatrace metrics response shape
  if (results?.resolution && results?.result) {
    const metricResults = results.result as Array<{
      metricId: string;
      data: Array<{ timestamps: number[]; values: (number | null)[] }>;
    }>;
    const rows: Record<string, unknown>[] = [];
    metricResults?.forEach((metric) => {
      metric.data?.forEach((series) => {
        series.timestamps?.forEach((ts, i) => {
          rows.push({
            metric: metric.metricId,
            timestamp: new Date(ts).toISOString(),
            value: series.values?.[i] ?? "null",
          });
        });
      });
    });
    return { columns: ["metric", "timestamp", "value"], rows };
  }

  // Handle Dynatrace logs response shape
  if (results?.results) {
    const logRows = results.results as Record<string, unknown>[];
    if (!logRows?.length) return { columns: [], rows: [] };
    const columns = Object.keys(logRows[0]);
    return { columns, rows: logRows };
  }

  // Handle generic array response
  if (Array.isArray(results)) {
    if (!results.length) return { columns: [], rows: [] };
    const columns = Object.keys(results[0] as object);
    return { columns, rows: results as Record<string, unknown>[] };
  }

  // Fallback: show raw JSON as single cell
  return {
    columns: ["response"],
    rows: [{ response: JSON.stringify(results, null, 2) }],
  };
}

function formatCell(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

export default function ResultsTable({ results, error }: ResultsTableProps) {
  if (error) {
    return (
      <div className="rounded-xl border border-[#f85149]/40 bg-[#1a0a0a] p-4 font-mono text-sm text-[#f85149]">
        ✗ {error}
      </div>
    );
  }

  if (!results) return null;

  const { columns, rows } = flattenResults(results);

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-[#1e2d3d] bg-[#0d1117] p-4 font-mono text-sm text-[#8b949e]">
        No results returned.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1e2d3d] bg-[#0d1117] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#1e2d3d] bg-[#0a0e14] flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#4aaeff] opacity-70">
          Results
        </span>
        <span className="text-[10px] font-mono text-[#8b949e]">
          {rows.length} row{rows.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="overflow-x-auto max-h-80 overflow-y-auto">
        <table className="w-full text-sm font-mono">
          <thead className="sticky top-0 bg-[#0a0e14] border-b border-[#1e2d3d]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="text-left px-4 py-2 text-[#4aaeff] text-xs font-normal whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-[#1e2d3d]/50 hover:bg-[#1e2d3d]/30 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-4 py-2 text-[#e6edf3] text-xs whitespace-nowrap max-w-[280px] truncate"
                    title={formatCell(row[col])}
                  >
                    {formatCell(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
