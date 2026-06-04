"use client";

export type DiffType = "match" | "add" | "remove" | "changed";

export interface DiffRow {
  lineNum: number;
  type: DiffType;
  clientLine: string | null;
  dtLine: string | null;
  clientLineNum: number | null;
  dtLineNum: number | null;
}

export interface DiffStats {
  clientTotal: number;
  dtTotal: number;
  matching: number;
  added: number;
  removed: number;
  changed: number;
}

function lcs(a: string[], b: string[]): number[][] {
  const rows = a.length;
  const cols = b.length;
  const dp: number[][] = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(0));

  for (let i = 1; i <= rows; i += 1) {
    for (let j = 1; j <= cols; j += 1) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  return dp;
}

function buildDiff(clientLines: string[], dtLines: string[]): DiffRow[] {
  const lcsLimit = 300;
  const rows: DiffRow[] = [];

  if (clientLines.length <= lcsLimit && dtLines.length <= lcsLimit) {
    const dp = lcs(clientLines, dtLines);
    let i = clientLines.length;
    let j = dtLines.length;
    const ops: Array<{ type: DiffType; ci: number | null; di: number | null }> = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && clientLines[i - 1] === dtLines[j - 1]) {
        ops.push({ type: "match", ci: i - 1, di: j - 1 });
        i -= 1;
        j -= 1;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        ops.push({ type: "add", ci: null, di: j - 1 });
        j -= 1;
      } else {
        ops.push({ type: "remove", ci: i - 1, di: null });
        i -= 1;
      }
    }

    ops.reverse();

    const merged: typeof ops = [];
    let k = 0;
    while (k < ops.length) {
      if (ops[k].type === "remove" && k + 1 < ops.length && ops[k + 1].type === "add") {
        merged.push({ type: "changed", ci: ops[k].ci, di: ops[k + 1].di });
        k += 2;
      } else {
        merged.push(ops[k]);
        k += 1;
      }
    }

    let lineNum = 1;
    for (const op of merged) {
      rows.push({
        lineNum: lineNum++,
        type: op.type,
        clientLine: op.ci !== null ? clientLines[op.ci] : null,
        dtLine: op.di !== null ? dtLines[op.di] : null,
        clientLineNum: op.ci !== null ? op.ci + 1 : null,
        dtLineNum: op.di !== null ? op.di + 1 : null,
      });
    }
  } else {
    const maxLen = Math.max(clientLines.length, dtLines.length);
    for (let idx = 0; idx < maxLen; idx += 1) {
      const client = idx < clientLines.length ? clientLines[idx] : null;
      const dt = idx < dtLines.length ? dtLines[idx] : null;
      const type: DiffType =
        client === null ? "add" : dt === null ? "remove" : client === dt ? "match" : "changed";

      rows.push({
        lineNum: idx + 1,
        type,
        clientLine: client,
        dtLine: dt,
        clientLineNum: client !== null ? idx + 1 : null,
        dtLineNum: dt !== null ? idx + 1 : null,
      });
    }
  }

  return rows;
}

export function computeDiff(clientText: string, dtText: string): { rows: DiffRow[]; stats: DiffStats } {
  const clientLines = clientText === "" ? [] : clientText.split("\n");
  const dtLines = dtText === "" ? [] : dtText.split("\n");
  const rows = buildDiff(clientLines, dtLines);

  return {
    rows,
    stats: {
      clientTotal: clientLines.length,
      dtTotal: dtLines.length,
      matching: rows.filter((row) => row.type === "match").length,
      added: rows.filter((row) => row.type === "add").length,
      removed: rows.filter((row) => row.type === "remove").length,
      changed: rows.filter((row) => row.type === "changed").length,
    },
  };
}

const rowClass: Record<DiffType, string> = {
  match: "bg-transparent",
  add: "bg-emerald-500/10",
  remove: "bg-red-500/10",
  changed: "bg-amber-500/10",
};

const badgeClass: Record<DiffType, string> = {
  match: "text-slate-500",
  add: "text-emerald-400",
  remove: "text-red-400",
  changed: "text-amber-400",
};

const badge: Record<DiffType, string> = {
  match: "=",
  add: "+",
  remove: "-",
  changed: "~",
};

export function buildDiffSummary(rows: DiffRow[]) {
  return rows
    .filter((row) => row.type !== "match")
    .slice(0, 80)
    .map((row) => {
      const client = row.clientLine !== null ? `"${row.clientLine}"` : "null";
      const dt = row.dtLine !== null ? `"${row.dtLine}"` : "null";
      return `Line ${row.lineNum} (Client:${row.clientLineNum ?? "-"} vs Dynatrace:${row.dtLineNum ?? "-"}) [${row.type}]: Client=${client} | Dynatrace=${dt}`;
    })
    .join("\n");
}

export default function LogDiff({ rows, stats }: { rows: DiffRow[]; stats: DiffStats }) {
  const identical = stats.added === 0 && stats.removed === 0 && stats.changed === 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-[#0d1117] px-4 py-3 text-sm">
        <span className="text-slate-400">
          Client: <strong className="text-white">{stats.clientTotal}</strong> lines
          <span className="mx-2 text-slate-600">|</span>
          Dynatrace: <strong className="text-white">{stats.dtTotal}</strong> lines
        </span>
        {identical ? (
          <span className="rounded border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
            Logs are identical
          </span>
        ) : (
          <>
            <span className="text-slate-500">{stats.matching} matching</span>
            <span className="text-emerald-400">+ {stats.added} only in Dynatrace</span>
            <span className="text-red-400">- {stats.removed} only in Client</span>
            <span className="text-amber-400">~ {stats.changed} changed</span>
          </>
        )}
      </div>

      <div className="max-h-[420px] overflow-auto rounded-lg border border-white/10 bg-[#0d1117]">
        <table className="w-full min-w-[980px] border-collapse font-mono text-xs">
          <thead className="sticky top-0 z-10 bg-[#111827] text-left">
            <tr className="border-b border-white/10">
              <th className="w-16 px-3 py-2 text-center font-semibold text-slate-500">#</th>
              <th className="border-l border-white/10 px-3 py-2 font-semibold text-blue-300">Client side</th>
              <th className="border-l border-white/10 px-3 py-2 font-semibold text-emerald-300">Dynatrace</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.lineNum} className={`border-b border-white/5 ${rowClass[row.type]}`}>
                <td className="whitespace-nowrap px-3 py-1.5 text-center align-top">
                  <span className="text-slate-600">{row.lineNum}</span>
                  <span className={`ml-2 font-bold ${badgeClass[row.type]}`}>{badge[row.type]}</span>
                </td>
                <td className="break-all border-l border-white/5 px-3 py-1.5 align-top text-slate-200">
                  {row.clientLine !== null ? (
                    <>
                      <span className="mr-2 select-none text-[10px] text-slate-600">{row.clientLineNum}</span>
                      {row.clientLine}
                    </>
                  ) : (
                    <span className="text-slate-600">-</span>
                  )}
                </td>
                <td className="break-all border-l border-white/5 px-3 py-1.5 align-top text-slate-200">
                  {row.dtLine !== null ? (
                    <>
                      <span className="mr-2 select-none text-[10px] text-slate-600">{row.dtLineNum}</span>
                      {row.dtLine}
                    </>
                  ) : (
                    <span className="text-slate-600">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
