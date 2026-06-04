"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AIDialog, { AnalysisResult, EngineState, emptyEngine } from "./AIDialog";
import LogDiff, { buildDiffSummary, computeDiff, DiffRow, DiffStats } from "./LogDiff";

const PLACEHOLDER_CLIENT = `[INFO] 2026-05-28 10:00:01 App started
[INFO] 2026-05-28 10:00:02 Connecting to database
[WARN] 2026-05-28 10:00:04 Cache miss for user 1042
[INFO] 2026-05-28 10:00:05 Request GET /api/data completed in 120ms
[ERROR] 2026-05-28 10:00:06 Timeout on downstream service`;

const PLACEHOLDER_DT = `[INFO] 2026-05-28 10:00:01 App started
[INFO] 2026-05-28 10:00:02 Connecting to database
[WARN] 2026-05-28 10:00:04 Cache miss for user 1042
[INFO] 2026-05-28 10:00:05 Request GET /api/data completed in 850ms
[ERROR] 2026-05-28 10:00:06 Timeout on downstream service
[ERROR] 2026-05-28 10:00:07 Circuit breaker OPEN for service payments`;

const STORAGE_KEYS = {
  history: "flowlog_logdiff_history",
  docs: "flowlog_logdiff_documents",
  tickets: "flowlog_logdiff_support_tickets",
};

type Tab = "compare" | "history" | "docs" | "support";

type ComparisonRecord = {
  id: string;
  createdAt: string;
  label: string;
  stats: DiffStats;
  clientPreview: string;
  dynatracePreview: string;
  diffSummary: string;
};

type DocumentRecord = {
  id: string;
  title: string;
  type: string;
  body: string;
  createdAt: string;
};

type TicketRecord = {
  id: string;
  subject: string;
  priority: string;
  message: string;
  createdAt: string;
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function fetchAnalysis(clientLog: string, dtLog: string, diffSummary: string): Promise<AnalysisResult> {
  const res = await fetch("/api/log-diff/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientLog, dtLog, diffSummary }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as AnalysisResult;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-[#0d1117] p-8 text-center">
      <p className="text-base font-semibold text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{body}</p>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d1117] p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

export default function LogDiffWorkspace() {
  const [tab, setTab] = useState<Tab>("compare");
  const [clientLog, setClientLog] = useState("");
  const [dtLog, setDtLog] = useState("");
  const [diffResult, setDiffResult] = useState<{ rows: DiffRow[]; stats: DiffStats } | null>(null);
  const [history, setHistory] = useState<ComparisonRecord[]>([]);
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [docForm, setDocForm] = useState({ title: "", type: "Runbook", body: "" });
  const [ticketForm, setTicketForm] = useState({ subject: "", priority: "Medium", message: "" });
  const [supportStatus, setSupportStatus] = useState<string | null>(null);
  const [aiState, setAiState] = useState<EngineState>(emptyEngine);
  const analysisRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(readJson<ComparisonRecord[]>(STORAGE_KEYS.history, []));
    setDocs(readJson<DocumentRecord[]>(STORAGE_KEYS.docs, []));
    setTickets(readJson<TicketRecord[]>(STORAGE_KEYS.tickets, []));
  }, []);

  const totals = useMemo(
    () => ({
      comparisons: history.length,
      docs: docs.length,
      tickets: tickets.length,
    }),
    [history.length, docs.length, tickets.length]
  );

  const hasDiff = Boolean(
    diffResult &&
      (diffResult.stats.added > 0 || diffResult.stats.removed > 0 || diffResult.stats.changed > 0)
  );
  const analyzeEnabled = hasDiff && !aiState.loading;

  const saveHistory = useCallback(
    (result: { rows: DiffRow[]; stats: DiffStats }) => {
      const record: ComparisonRecord = {
        id: makeId("cmp"),
        createdAt: new Date().toISOString(),
        label: `Comparison ${history.length + 1}`,
        stats: result.stats,
        clientPreview: clientLog.slice(0, 800),
        dynatracePreview: dtLog.slice(0, 800),
        diffSummary: buildDiffSummary(result.rows).slice(0, 4000),
      };
      const next = [record, ...history].slice(0, 100);
      setHistory(next);
      writeJson(STORAGE_KEYS.history, next);
    },
    [clientLog, dtLog, history]
  );

  const runCompare = useCallback(() => {
    if (!clientLog.trim() && !dtLog.trim()) return;
    const result = computeDiff(clientLog, dtLog);
    setDiffResult(result);
    setAiState(emptyEngine);
    saveHistory(result);
  }, [clientLog, dtLog, saveHistory]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        runCompare();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [runCompare]);

  const runAi = async (rows: DiffRow[]) => {
    setAiState({ loading: true, error: null, result: null });
    setTimeout(() => analysisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);

    try {
      const result = await fetchAnalysis(clientLog, dtLog, buildDiffSummary(rows));
      setAiState({ loading: false, error: null, result });
    } catch (error) {
      setAiState({
        loading: false,
        error: error instanceof Error ? error.message : String(error),
        result: null,
      });
    }
  };

  const addDocument = (event: React.FormEvent) => {
    event.preventDefault();
    const nextDoc: DocumentRecord = { id: makeId("doc"), createdAt: new Date().toISOString(), ...docForm };
    const next = [nextDoc, ...docs];
    setDocs(next);
    writeJson(STORAGE_KEYS.docs, next);
    setDocForm({ title: "", type: "Runbook", body: "" });
  };

  const submitTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    setSupportStatus(null);
    const nextTicket: TicketRecord = { id: makeId("tkt"), createdAt: new Date().toISOString(), ...ticketForm };

    try {
      const res = await fetch("/api/log-diff/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextTicket),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ticket email failed");
      const next = [nextTicket, ...tickets];
      setTickets(next);
      writeJson(STORAGE_KEYS.tickets, next);
      setTicketForm({ subject: "", priority: "Medium", message: "" });
      setSupportStatus(data.emailSent ? "Ticket sent to support@flowlog.dev." : "Ticket saved. Email provider is not configured.");
    } catch (error) {
      setSupportStatus(error instanceof Error ? error.message : String(error));
    }
  };

  const navItem = (id: Tab, label: string) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
        tab === id ? "bg-[#6366f1]/20 text-[#a5b4fc]" : "text-slate-500 hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="h-full overflow-auto bg-[#010409] p-6 text-slate-200">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#818cf8]">FlowLog workspace</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Log Diff</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Compare customer-side logs against Dynatrace output, save the investigation trail, and ask AI to explain the drift.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#0b1117] p-1">
            {navItem("compare", "Compare")}
            {navItem("history", `History ${totals.comparisons}`)}
            {navItem("docs", `Docs ${totals.docs}`)}
            {navItem("support", `Support ${totals.tickets}`)}
          </div>
        </div>

        {tab === "compare" && (
          <section>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <MetricTile label="Client lines" value={diffResult?.stats.clientTotal ?? 0} />
              <MetricTile label="Dynatrace lines" value={diffResult?.stats.dtTotal ?? 0} />
              <MetricTile label="Changed" value={diffResult?.stats.changed ?? 0} />
              <MetricTile label="Saved records" value={history.length} />
            </div>

            <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#0d1117] p-3">
              <button
                onClick={() => {
                  setClientLog("");
                  setDtLog("");
                  setDiffResult(null);
                  setAiState(emptyEngine);
                }}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-400 transition hover:text-white"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  setClientLog(dtLog);
                  setDtLog(clientLog);
                }}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-400 transition hover:text-white"
              >
                Swap
              </button>
              <button onClick={runCompare} className="rounded-lg bg-[#2563eb] px-3 py-2 text-sm font-semibold text-white">
                Compare and save
              </button>
              <button
                disabled={!analyzeEnabled}
                onClick={() => diffResult && runAi(diffResult.rows)}
                className="rounded-lg border border-[#818cf8]/40 bg-[#6366f1]/10 px-3 py-2 text-sm font-semibold text-[#a5b4fc] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Analyze with Claude
              </button>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <label className="text-sm font-semibold text-blue-300">
                Client side log
                <textarea
                  value={clientLog}
                  onChange={(event) => setClientLog(event.target.value)}
                  placeholder={PLACEHOLDER_CLIENT}
                  spellCheck={false}
                  className="mt-2 min-h-72 w-full resize-y rounded-xl border border-blue-400/30 bg-[#0d1117] p-3 font-mono text-xs leading-6 text-white outline-none transition focus:border-blue-300"
                />
              </label>
              <label className="text-sm font-semibold text-emerald-300">
                Dynatrace log
                <textarea
                  value={dtLog}
                  onChange={(event) => setDtLog(event.target.value)}
                  placeholder={PLACEHOLDER_DT}
                  spellCheck={false}
                  className="mt-2 min-h-72 w-full resize-y rounded-xl border border-emerald-400/30 bg-[#0d1117] p-3 font-mono text-xs leading-6 text-white outline-none transition focus:border-emerald-300"
                />
              </label>
            </div>

            {diffResult && <LogDiff rows={diffResult.rows} stats={diffResult.stats} />}
            <div ref={analysisRef}>
              <AIDialog state={aiState} />
            </div>
          </section>
        )}

        {tab === "history" && (
          <section className="grid grid-cols-1 gap-3">
            {history.length === 0 && <EmptyState title="No comparison history yet" body="Run a comparison to create a timestamped investigation record." />}
            {history.map((item) => (
              <article key={item.id} className="rounded-xl border border-white/10 bg-[#0d1117] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded border border-white/10 px-2 py-1 text-slate-400">{item.stats.matching} match</span>
                    <span className="rounded border border-amber-400/40 px-2 py-1 text-amber-300">{item.stats.changed} changed</span>
                    <span className="rounded border border-emerald-400/40 px-2 py-1 text-emerald-300">{item.stats.added} added</span>
                    <span className="rounded border border-red-400/40 px-2 py-1 text-red-300">{item.stats.removed} removed</span>
                  </div>
                </div>
                <pre className="mt-4 max-h-48 overflow-auto rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-6 text-slate-400">
                  {item.diffSummary || "No differences recorded."}
                </pre>
              </article>
            ))}
          </section>
        )}

        {tab === "docs" && (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
            <form onSubmit={addDocument} className="rounded-xl border border-white/10 bg-[#0d1117] p-4">
              <h2 className="text-lg font-semibold text-white">Add documentation</h2>
              <label className="mt-4 block text-sm font-semibold text-slate-300">
                Title
                <input required value={docForm.title} onChange={(event) => setDocForm({ ...docForm, title: event.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none focus:border-[#818cf8]" />
              </label>
              <label className="mt-4 block text-sm font-semibold text-slate-300">
                Type
                <select value={docForm.type} onChange={(event) => setDocForm({ ...docForm, type: event.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none focus:border-[#818cf8]">
                  <option>Runbook</option>
                  <option>Customer note</option>
                  <option>Known issue</option>
                  <option>Escalation path</option>
                </select>
              </label>
              <label className="mt-4 block text-sm font-semibold text-slate-300">
                Document
                <textarea required value={docForm.body} onChange={(event) => setDocForm({ ...docForm, body: event.target.value })} className="mt-2 min-h-40 w-full resize-y rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none focus:border-[#818cf8]" />
              </label>
              <button className="mt-4 w-full rounded-lg bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white">Save document</button>
            </form>
            <div className="grid grid-cols-1 gap-3">
              {docs.length === 0 && <EmptyState title="No documents yet" body="Add runbooks, customer notes, known issues, or escalation paths." />}
              {docs.map((doc) => (
                <article key={doc.id} className="rounded-xl border border-white/10 bg-[#0d1117] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-white">{doc.title}</h3>
                    <span className="rounded border border-white/10 px-2 py-1 text-xs font-semibold text-slate-400">{doc.type}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(doc.createdAt)}</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-400">{doc.body}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "support" && (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
            <form onSubmit={submitTicket} className="rounded-xl border border-white/10 bg-[#0d1117] p-4">
              <h2 className="text-lg font-semibold text-white">Generate support ticket</h2>
              <label className="mt-4 block text-sm font-semibold text-slate-300">
                Subject
                <input required value={ticketForm.subject} onChange={(event) => setTicketForm({ ...ticketForm, subject: event.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none focus:border-[#818cf8]" />
              </label>
              <label className="mt-4 block text-sm font-semibold text-slate-300">
                Priority
                <select value={ticketForm.priority} onChange={(event) => setTicketForm({ ...ticketForm, priority: event.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none focus:border-[#818cf8]">
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Urgent</option>
                </select>
              </label>
              <label className="mt-4 block text-sm font-semibold text-slate-300">
                Message
                <textarea required value={ticketForm.message} onChange={(event) => setTicketForm({ ...ticketForm, message: event.target.value })} className="mt-2 min-h-44 w-full resize-y rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none focus:border-[#818cf8]" />
              </label>
              <button className="mt-4 w-full rounded-lg bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white">Send to support</button>
              {supportStatus && <p className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-slate-400">{supportStatus}</p>}
            </form>
            <div className="grid grid-cols-1 gap-3">
              {tickets.length === 0 && <EmptyState title="No tickets yet" body="Support tickets will be timestamped here after submission." />}
              {tickets.map((ticket) => (
                <article key={ticket.id} className="rounded-xl border border-white/10 bg-[#0d1117] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-white">{ticket.subject}</h3>
                    <span className="rounded border border-[#818cf8]/40 px-2 py-1 text-xs font-semibold text-[#a5b4fc]">{ticket.priority}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(ticket.createdAt)}</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-400">{ticket.message}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
