"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Cpu, Database, Layers3 } from "lucide-react";

type EntityOption = { id: string; name: string; type: string; clusterId?: string | null };
type Point = { timestamp: number; time: string; value: number };

type KubernetesPayload = {
  from: string;
  cluster: EntityOption | null;
  clusters: EntityOption[];
  nodes: EntityOption[];
  selectedNode: EntityOption;
  summary: {
    cpuUsagePct: number | null;
    cpuRequestsPct: number | null;
    cpuLimitsPct: number | null;
    memoryUsagePct: number | null;
    memoryRequestsPct: number | null;
    memoryLimitsPct: number | null;
    podsUtilizationPct: number | null;
    raw: {
      cpuUsage: number | null;
      cpuAllocatable: number | null;
      cpuRequests: number | null;
      cpuLimits: number | null;
      cpuThrottled: number | null;
      memoryUsage: number | null;
      memoryAllocatable: number | null;
      memoryRequests: number | null;
      memoryLimits: number | null;
      pods: number | null;
      podsAllocatable: number | null;
    };
  };
  series: {
    cpuUsagePct: Point[];
    cpuRequestsPct: Point[];
    cpuLimitsPct: Point[];
    memoryUsagePct: Point[];
    memoryRequestsPct: Point[];
    memoryLimitsPct: Point[];
    podsUtilizationPct: Point[];
  };
  workloadSummary: {
    total: number;
    pods: number;
    desiredPods: number;
    restarts: number;
    oomKills: number;
  };
  podSummary: {
    total: number;
    running: number;
    ready: number;
    restarts: number;
  };
  workloads: Array<{
    id: string;
    name: string;
    cpuUsage: number | null;
    cpuRequests: number | null;
    cpuLimits: number | null;
    cpuRequestsPct: number | null;
    cpuLimitsPct: number | null;
    cpuThrottled: number | null;
    memoryUsage: number | null;
    memoryRequests: number | null;
    memoryLimits: number | null;
    memoryRequestsPct: number | null;
    memoryLimitsPct: number | null;
    pods: number | null;
    desiredPods: number | null;
    desiredContainers: number | null;
    conditions: number | null;
    restarts: number | null;
    oomKills: number | null;
  }>;
  pods: Array<{
    id: string;
    name: string;
    workloadId: string | null;
    workloadName: string | null;
    namespace: string | null;
    nodeId: string | null;
    nodeName: string | null;
    phase: string | null;
    condition: string | null;
    restarts: number | null;
    requestsCpu: number | null;
    limitsCpu: number | null;
    requestsMemory: number | null;
    limitsMemory: number | null;
    runningContainers: number | null;
    desiredContainers: number | null;
    createdAt: number | null;
    internalIp: string | null;
  }>;
  error?: string;
};

const COLORS = {
  purple: "#8b5cf6",
  teal: "#5bc0b3",
  red: "#db0050",
  blue: "#60a5fa",
  amber: "#f59e0b",
};

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return "null";
  return `${value.toFixed(2)}%`;
}

function formatMcore(value: number | null) {
  if (value === null || Number.isNaN(value)) return "null";
  if (value >= 1000) return `${(value / 1000).toFixed(2)} core`;
  return `${value.toFixed(1)} mcore`;
}

function formatBytes(value: number | null) {
  if (value === null || Number.isNaN(value)) return "null";
  const gb = value / 1024 / 1024 / 1024;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function tooltipPercent(value: unknown, label: string) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  return [`${numeric.toFixed(2)}%`, label];
}

function StatTile({
  label,
  value,
  tone = "teal",
  large = false,
}: {
  label: string;
  value: string;
  tone?: "teal" | "red";
  large?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-white/10 bg-[#171123]">
      <div className="flex items-center justify-between px-4 py-2">
        <h3 className="text-sm font-semibold text-slate-100">{label}</h3>
      </div>
      <div
        className={`flex items-center justify-center px-4 py-4 text-black ${
          tone === "red" ? "bg-[#db0050] text-white" : "bg-[#5bc0b3]"
        } ${large ? "min-h-[128px]" : "min-h-[70px]"}`}
      >
        <span className={`${large ? "text-6xl" : "text-4xl"} font-semibold tracking-normal`}>
          {value}
        </span>
      </div>
    </div>
  );
}

function SmallStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "warn" | "bad";
}) {
  const toneClass =
    tone === "bad"
      ? "text-red-300"
      : tone === "warn"
        ? "text-amber-300"
        : "text-white";

  return (
    <div className="rounded-md border border-white/10 bg-[#171123] p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="space-y-4">
      <div className="h-10 animate-pulse rounded-md bg-white/5" />
      <div className="grid gap-3 xl:grid-cols-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-md bg-white/5" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-md bg-white/5" />
    </div>
  );
}

function MetricChart({
  title,
  data,
  color,
  area = false,
}: {
  title: string;
  data: Point[];
  color: string;
  area?: boolean;
}) {
  return (
    <section className="rounded-md border border-white/10 bg-[#171123] p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-100">{title}</h3>
      {data.length === 0 ? (
        <div className="flex h-52 items-center justify-center text-sm text-slate-500">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          {area ? (
            <AreaChart data={data}>
              <CartesianGrid stroke="#2e2540" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: "#b9a7d8", fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis tick={{ fill: "#b9a7d8", fontSize: 12 }} tickLine={false} axisLine={false} width={46} unit="%" />
              <Tooltip contentStyle={{ background: "#171123", border: "1px solid #3b3151", borderRadius: 6 }} formatter={(value) => tooltipPercent(value, title)} />
              <Area type="monotone" dataKey="value" stroke={color} fill={`${color}55`} strokeWidth={2} dot={false} />
            </AreaChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid stroke="#2e2540" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: "#b9a7d8", fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis tick={{ fill: "#b9a7d8", fontSize: 12 }} tickLine={false} axisLine={false} width={46} unit="%" />
              <Tooltip contentStyle={{ background: "#171123", border: "1px solid #3b3151", borderRadius: 6 }} formatter={(value) => tooltipPercent(value, title)} />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      )}
    </section>
  );
}

function QuotaTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ name: string; value: string; requests: string; limits: string; requestsPct: string; limitsPct: string }>;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-white/10 bg-[#171123]">
      <div className="border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-white/[0.03] text-[#c4b5fd]">
            <tr>
              <th className="px-4 py-2 font-semibold">Name</th>
              <th className="px-4 py-2 font-semibold">Usage</th>
              <th className="px-4 py-2 font-semibold">Requests</th>
              <th className="px-4 py-2 font-semibold">Limits</th>
              <th className="px-4 py-2 font-semibold">Requests %</th>
              <th className="px-4 py-2 font-semibold">Limits %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-slate-100">
            {rows.map((row) => (
              <tr key={row.name} className="hover:bg-white/[0.03]">
                <td className="px-4 py-2 font-medium">{row.name}</td>
                <td className="px-4 py-2 font-mono">{row.value}</td>
                <td className="px-4 py-2 font-mono">{row.requests}</td>
                <td className="px-4 py-2 font-mono">{row.limits}</td>
                <td className="px-4 py-2 font-mono">{row.requestsPct}</td>
                <td className="px-4 py-2 font-mono">{row.limitsPct}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WorkloadsTable({ workloads }: { workloads: NonNullable<KubernetesPayload["workloads"]> }) {
  return (
    <section className="overflow-hidden rounded-md border border-white/10 bg-[#171123]">
      <div className="border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-100">Workloads, deployments, and pods</h3>
        <p className="mt-1 text-xs text-slate-500">
          Pulled from Dynatrace Kubernetes workload metrics for the selected cluster.
        </p>
      </div>
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[1320px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#211832] text-[#c4b5fd]">
            <tr>
              <th className="px-4 py-2 font-semibold">Workload</th>
              <th className="px-4 py-2 font-semibold">Pods</th>
              <th className="px-4 py-2 font-semibold">Desired</th>
              <th className="px-4 py-2 font-semibold">CPU usage</th>
              <th className="px-4 py-2 font-semibold">CPU requests</th>
              <th className="px-4 py-2 font-semibold">CPU limits</th>
              <th className="px-4 py-2 font-semibold">CPU requests %</th>
              <th className="px-4 py-2 font-semibold">CPU limits %</th>
              <th className="px-4 py-2 font-semibold">Memory usage</th>
              <th className="px-4 py-2 font-semibold">Memory requests</th>
              <th className="px-4 py-2 font-semibold">Memory limits</th>
              <th className="px-4 py-2 font-semibold">Memory requests %</th>
              <th className="px-4 py-2 font-semibold">Memory limits %</th>
              <th className="px-4 py-2 font-semibold">Restarts</th>
              <th className="px-4 py-2 font-semibold">OOM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-slate-100">
            {workloads.map((workload) => (
              <tr key={workload.id} className="hover:bg-white/[0.03]">
                <td className="max-w-[280px] px-4 py-2">
                  <p className="truncate font-medium">{workload.name}</p>
                  <p className="truncate font-mono text-[10px] text-slate-600">{workload.id}</p>
                </td>
                <td className="px-4 py-2 font-mono">{workload.pods ?? "null"}</td>
                <td className="px-4 py-2 font-mono">{workload.desiredPods ?? "null"}</td>
                <td className="px-4 py-2 font-mono">{formatMcore(workload.cpuUsage)}</td>
                <td className="px-4 py-2 font-mono">{formatMcore(workload.cpuRequests)}</td>
                <td className="px-4 py-2 font-mono">{formatMcore(workload.cpuLimits)}</td>
                <td className="px-4 py-2 font-mono">{formatPercent(workload.cpuRequestsPct)}</td>
                <td className="px-4 py-2 font-mono">{formatPercent(workload.cpuLimitsPct)}</td>
                <td className="px-4 py-2 font-mono">{formatBytes(workload.memoryUsage)}</td>
                <td className="px-4 py-2 font-mono">{formatBytes(workload.memoryRequests)}</td>
                <td className="px-4 py-2 font-mono">{formatBytes(workload.memoryLimits)}</td>
                <td className="px-4 py-2 font-mono">{formatPercent(workload.memoryRequestsPct)}</td>
                <td className="px-4 py-2 font-mono">{formatPercent(workload.memoryLimitsPct)}</td>
                <td className="px-4 py-2 font-mono">{workload.restarts ?? "null"}</td>
                <td className="px-4 py-2 font-mono">{workload.oomKills ?? "null"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PodsTable({ pods }: { pods: NonNullable<KubernetesPayload["pods"]> }) {
  return (
    <section className="overflow-hidden rounded-md border border-white/10 bg-[#171123]">
      <div className="border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-100">Kubernetes pods</h3>
        <p className="mt-1 text-xs text-slate-500">
          Pod instances from Dynatrace entity relationships for the selected cluster.
        </p>
      </div>
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#211832] text-[#c4b5fd]">
            <tr>
              <th className="px-4 py-2 font-semibold">Pod</th>
              <th className="px-4 py-2 font-semibold">Namespace</th>
              <th className="px-4 py-2 font-semibold">Workload</th>
              <th className="px-4 py-2 font-semibold">Node</th>
              <th className="px-4 py-2 font-semibold">Phase</th>
              <th className="px-4 py-2 font-semibold">Condition</th>
              <th className="px-4 py-2 font-semibold">Containers</th>
              <th className="px-4 py-2 font-semibold">Restarts</th>
              <th className="px-4 py-2 font-semibold">CPU request</th>
              <th className="px-4 py-2 font-semibold">CPU limit</th>
              <th className="px-4 py-2 font-semibold">Memory request</th>
              <th className="px-4 py-2 font-semibold">Memory limit</th>
              <th className="px-4 py-2 font-semibold">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-slate-100">
            {pods.map((pod) => (
              <tr key={pod.id} className="hover:bg-white/[0.03]">
                <td className="max-w-[280px] px-4 py-2">
                  <p className="truncate font-medium">{pod.name}</p>
                  <p className="truncate font-mono text-[10px] text-slate-600">{pod.id}</p>
                </td>
                <td className="px-4 py-2 font-mono">{pod.namespace ?? "null"}</td>
                <td className="max-w-[220px] px-4 py-2">
                  <p className="truncate">{pod.workloadName ?? "null"}</p>
                </td>
                <td className="max-w-[220px] px-4 py-2">
                  <p className="truncate">{pod.nodeName ?? "null"}</p>
                </td>
                <td className="px-4 py-2 font-mono">{pod.phase ?? "null"}</td>
                <td className="px-4 py-2 font-mono">{pod.condition ?? "null"}</td>
                <td className="px-4 py-2 font-mono">
                  {pod.runningContainers ?? "null"} / {pod.desiredContainers ?? "null"}
                </td>
                <td className="px-4 py-2 font-mono">{pod.restarts ?? "null"}</td>
                <td className="px-4 py-2 font-mono">{formatMcore(pod.requestsCpu)}</td>
                <td className="px-4 py-2 font-mono">{formatMcore(pod.limitsCpu)}</td>
                <td className="px-4 py-2 font-mono">{formatBytes(pod.requestsMemory)}</td>
                <td className="px-4 py-2 font-mono">{formatBytes(pod.limitsMemory)}</td>
                <td className="px-4 py-2 font-mono">{pod.internalIp ?? "null"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function KubernetesNodeDashboard() {
  const [selectedClusterId, setSelectedClusterId] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [data, setData] = useState<KubernetesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedClusterId) params.set("clusterId", selectedClusterId);
    if (selectedNodeId) params.set("nodeId", selectedNodeId);
    const query = params.toString() ? `?${params.toString()}` : "";

    setLoading(true);
    setError(null);

    fetch(`/api/dynatrace/kubernetes${query}`)
      .then((response) => response.json())
      .then((json: KubernetesPayload) => {
        if (json.error) {
          setError(json.error);
          return;
        }
        setData(json);
        if (!selectedClusterId && json.cluster?.id) setSelectedClusterId(json.cluster.id);
        if (!selectedNodeId && json.selectedNode?.id) setSelectedNodeId(json.selectedNode.id);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedClusterId, selectedNodeId]);

  const cpuRows = useMemo(() => {
    if (!data) return [];
    const raw = data.summary.raw;
    return [
      {
        name: data.selectedNode.name,
        value: formatMcore(raw.cpuUsage),
        requests: formatMcore(raw.cpuRequests),
        limits: formatMcore(raw.cpuLimits),
        requestsPct: formatPercent(data.summary.cpuRequestsPct),
        limitsPct: formatPercent(data.summary.cpuLimitsPct),
      },
    ];
  }, [data]);

  const memoryRows = useMemo(() => {
    if (!data) return [];
    const raw = data.summary.raw;
    return [
      {
        name: data.selectedNode.name,
        value: formatBytes(raw.memoryUsage),
        requests: formatBytes(raw.memoryRequests),
        limits: formatBytes(raw.memoryLimits),
        requestsPct: formatPercent(data.summary.memoryRequestsPct),
        limitsPct: formatPercent(data.summary.memoryLimitsPct),
      },
    ];
  }, [data]);

  if (loading && !data) return <LoadingBlock />;

  if (error) {
    return (
      <div className="rounded-md border border-red-500/40 bg-red-950/30 p-5 text-sm text-red-200">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
            Cluster
          </label>
          <select
            className="h-11 w-full rounded-md border border-white/10 bg-[#241a36] px-3 text-sm font-semibold text-slate-100 outline-none transition focus:border-[#8b5cf6]"
            value={selectedClusterId}
            onChange={(event) => {
              setSelectedClusterId(event.target.value);
              setSelectedNodeId("");
            }}
          >
            {data.clusters.map((cluster) => (
              <option key={cluster.id} value={cluster.id}>
                {cluster.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-1">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
            Node
          </label>
          <select
            className="h-11 w-full rounded-md border border-white/10 bg-[#241a36] px-3 text-sm font-semibold text-slate-100 outline-none transition focus:border-[#8b5cf6]"
            value={selectedNodeId}
            onChange={(event) => setSelectedNodeId(event.target.value)}
          >
            {data.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-white">
          Node: <span className="text-[#a78bfa] underline">{data.selectedNode.name}</span>
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          Kubernetes node metrics from Dynatrace for the last 2 hours.
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_1fr]">
        <div className="grid gap-3 md:grid-cols-3 xl:col-span-3">
          <StatTile label="CPU utilization" value={formatPercent(data.summary.cpuUsagePct)} />
          <StatTile label="CPU utilization (requests)" value={formatPercent(data.summary.cpuRequestsPct)} />
          <StatTile
            label="CPU utilization (limits)"
            value={formatPercent(data.summary.cpuLimitsPct)}
            tone={(data.summary.cpuLimitsPct ?? 0) > 100 ? "red" : "teal"}
          />
          <StatTile label="Memory utilization" value={formatPercent(data.summary.memoryUsagePct)} />
          <StatTile label="Memory utilization (requests)" value={formatPercent(data.summary.memoryRequestsPct)} />
          <StatTile label="Memory utilization (limits)" value={formatPercent(data.summary.memoryLimitsPct)} />
        </div>
        <StatTile label="Pods utilization" value={formatPercent(data.summary.podsUtilizationPct)} large />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <MetricChart title="CPU utilization" data={data.series.cpuUsagePct} color={COLORS.purple} area />
        <MetricChart title="CPU utilization (requests)" data={data.series.cpuRequestsPct} color={COLORS.blue} />
        <MetricChart title="CPU utilization (limits)" data={data.series.cpuLimitsPct} color={COLORS.red} />
        <MetricChart title="Memory utilization" data={data.series.memoryUsagePct} color={COLORS.teal} area />
        <MetricChart title="Memory utilization (requests)" data={data.series.memoryRequestsPct} color={COLORS.amber} />
        <MetricChart title="Memory utilization (limits)" data={data.series.memoryLimitsPct} color={COLORS.purple} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <QuotaTable title="CPU quota" rows={cpuRows} />
        <QuotaTable title="Memory quota" rows={memoryRows} />
      </div>

      <section className="grid gap-3 text-sm text-slate-300 md:grid-cols-3">
        <div className="flex items-center gap-3 rounded-md border border-white/10 bg-[#171123] p-4">
          <Cpu className="h-5 w-5 text-[#8b5cf6]" />
          <div>
            <p className="font-semibold text-white">CPU allocatable</p>
            <p className="font-mono">{formatMcore(data.summary.raw.cpuAllocatable)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-md border border-white/10 bg-[#171123] p-4">
          <Database className="h-5 w-5 text-[#5bc0b3]" />
          <div>
            <p className="font-semibold text-white">Memory allocatable</p>
            <p className="font-mono">{formatBytes(data.summary.raw.memoryAllocatable)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-md border border-white/10 bg-[#171123] p-4">
          <Layers3 className="h-5 w-5 text-[#60a5fa]" />
          <div>
            <p className="font-semibold text-white">Pods</p>
            <p className="font-mono">
              {data.summary.raw.pods ?? "null"} / {data.summary.raw.podsAllocatable ?? "null"}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4 pt-2">
        <div>
          <h2 className="text-2xl font-semibold text-white">Cluster workloads</h2>
          <p className="mt-1 text-sm text-slate-300">
            Workload deployments and pod quota data inherited from your Dynatrace Kubernetes dashboard.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SmallStat label="Workloads" value={data.workloadSummary?.total ?? 0} />
          <SmallStat label="Pods" value={`${data.workloadSummary?.pods ?? 0} / ${data.workloadSummary?.desiredPods ?? 0}`} />
          <SmallStat
            label="Restarts"
            value={data.workloadSummary?.restarts ?? 0}
            tone={(data.workloadSummary?.restarts ?? 0) > 0 ? "warn" : "default"}
          />
          <SmallStat
            label="OOM kills"
            value={data.workloadSummary?.oomKills ?? 0}
            tone={(data.workloadSummary?.oomKills ?? 0) > 0 ? "bad" : "default"}
          />
          <SmallStat label="Selected cluster" value={data.cluster?.name ?? "Unknown"} />
        </div>

        <WorkloadsTable workloads={data.workloads ?? []} />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SmallStat label="Pod instances" value={data.podSummary?.total ?? 0} />
          <SmallStat label="Running" value={data.podSummary?.running ?? 0} />
          <SmallStat label="Ready" value={data.podSummary?.ready ?? 0} />
          <SmallStat
            label="Pod restarts"
            value={data.podSummary?.restarts ?? 0}
            tone={(data.podSummary?.restarts ?? 0) > 0 ? "warn" : "default"}
          />
        </div>

        <PodsTable pods={data.pods ?? []} />
      </section>

      <p className="text-xs text-slate-500">
        These values come from Dynatrace Kubernetes node and workload metrics for Pinvest. Per-log DQL execution
        inside FlowLog still needs a Dynatrace Platform token with Grail permissions.
      </p>
    </div>
  );
}
