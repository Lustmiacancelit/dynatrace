"use client";

export interface Issue {
  lineClient: string | null;
  lineDynatrace: string | null;
  source: "client" | "dynatrace" | "both";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  fix: string;
}

export interface AnalysisResult {
  verdict: "pass" | "fail";
  summary: string;
  issues: Issue[];
}

export interface EngineState {
  loading: boolean;
  error: string | null;
  result: AnalysisResult | null;
}

const severityClass: Record<Issue["severity"], string> = {
  high: "border-red-400/50 bg-red-500/10 text-red-200",
  medium: "border-amber-400/50 bg-amber-500/10 text-amber-200",
  low: "border-emerald-400/50 bg-emerald-500/10 text-emerald-200",
};

export const emptyEngine: EngineState = { loading: false, error: null, result: null };

export default function AIDialog({ state }: { state: EngineState }) {
  if (!state.loading && !state.error && !state.result) return null;

  return (
    <section className="mt-5 rounded-lg border border-white/10 bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">AI Analysis</h2>
          <p className="text-xs text-slate-500">Claude compares the client log with Dynatrace output.</p>
        </div>
        {state.result && (
          <span
            className={`rounded border px-2 py-1 text-xs font-semibold ${
              state.result.verdict === "pass"
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                : "border-red-400/40 bg-red-500/10 text-red-300"
            }`}
          >
            {state.result.verdict === "pass" ? "PASS" : "FAIL"}
          </span>
        )}
      </div>

      <div className="p-4">
        {state.loading && (
          <div className="flex h-28 items-center justify-center text-sm text-slate-400">
            Analyzing log differences...
          </div>
        )}

        {state.error && (
          <div className="rounded-lg border border-red-400/40 bg-red-950/30 p-3 text-sm text-red-200">
            {state.error}
          </div>
        )}

        {state.result && !state.loading && (
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Summary</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">{state.result.summary}</p>
            </div>

            {state.result.issues?.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Issues ({state.result.issues.length})
                </p>
                {state.result.issues.map((issue, index) => (
                  <article key={`${issue.title}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {(issue.lineClient || issue.lineDynatrace) && (
                        <span className="rounded border border-white/10 bg-black/20 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                          {issue.lineClient ? `C:${issue.lineClient}` : ""}
                          {issue.lineClient && issue.lineDynatrace ? "/" : ""}
                          {issue.lineDynatrace ? `DT:${issue.lineDynatrace}` : ""}
                        </span>
                      )}
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${severityClass[issue.severity]}`}>
                        {issue.severity.toUpperCase()}
                      </span>
                      <span className="rounded border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                        {issue.source}
                      </span>
                      <h3 className="text-sm font-semibold text-white">{issue.title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{issue.description}</p>
                    <pre className="mt-3 whitespace-pre-wrap rounded border-l-2 border-slate-600 bg-black/20 p-3 font-mono text-xs leading-5 text-slate-200">
                      {issue.fix}
                    </pre>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
