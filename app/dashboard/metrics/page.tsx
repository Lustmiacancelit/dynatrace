import { requireSession } from "@/lib/auth";
import TimeSeriesChart from "@/components/ui/TimeSeriesChart";
import ServiceList from "@/components/ui/ServiceList";

const METRICS = [
  { title: "Host CPU Usage (%)", metric: "builtin:host.cpu.usage", color: "#6366f1" },
  { title: "Host Memory Usage (%)", metric: "builtin:host.mem.usage", color: "#8b5cf6" },
  { title: "Service Response Time (ms)", metric: "builtin:service.response.time", type: "area" as const, color: "#10b981" },
  { title: "Service Error Rate (%)", metric: "builtin:service.errors.total.rate", type: "area" as const, color: "#ef4444" },
  { title: "Service Throughput (req/s)", metric: "builtin:service.requestCount.total", color: "#3b82f6" },
  { title: "Process CPU (%)", metric: "builtin:process.cpu.usage", color: "#f59e0b" },
];

export default function MetricsPage() {
  requireSession();
  return (
    <div className="h-full overflow-auto p-6">
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#6366f1]">FlowLog Observability</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Metrics</h1>
          <p className="mt-1 text-sm text-slate-400">Time-series data from your Dynatrace environment (last 1h)</p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {METRICS.map((m) => (
            <TimeSeriesChart key={m.metric} {...m} />
          ))}
        </div>

        <div className="mt-6">
          <ServiceList entityType="SERVICE" />
        </div>
      </div>
    </div>
  );
}
