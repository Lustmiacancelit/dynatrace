import { requireSession } from "@/lib/auth";
import { getProblems, getEntities } from "@/lib/dynatrace";
import MetricCard from "@/components/ui/MetricCard";
import TimeSeriesChart from "@/components/ui/TimeSeriesChart";
import ProblemsTable from "@/components/ui/ProblemsBadge";
import LogsTable from "@/components/ui/LogsTable";
import { Activity, AlertTriangle, Server, Cpu } from "lucide-react";

export default async function DashboardPage() {
  requireSession();

  const [problemsResult, entitiesResult] = await Promise.allSettled([
    getProblems(),
    getEntities("SERVICE"),
  ]);

  const problemsTotal =
    problemsResult.status === "fulfilled" ? problemsResult.value.totalCount : null;
  const servicesTotal =
    entitiesResult.status === "fulfilled" ? entitiesResult.value.totalCount : null;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Overview</h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time observability for your Dynatrace environment
          </p>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            title="Services"
            value={servicesTotal ?? "—"}
            subtitle="Total monitored"
            icon={<Server className="h-4 w-4" />}
          />
          <MetricCard
            title="Open Problems"
            value={problemsTotal ?? "—"}
            subtitle="Active incidents"
            alert={problemsTotal !== null && problemsTotal > 0}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <MetricCard
            title="CPU Usage"
            value="—"
            subtitle="See chart below"
            icon={<Cpu className="h-4 w-4" />}
          />
          <MetricCard
            title="Response Time"
            value="—"
            subtitle="See chart below"
            icon={<Activity className="h-4 w-4" />}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TimeSeriesChart
            title="CPU Usage (%)"
            metric="builtin:host.cpu.usage"
          />
          <TimeSeriesChart
            title="Service Response Time (ms)"
            metric="builtin:service.response.time"
            type="area"
            color="#10b981"
          />
        </div>

        {/* Problems + Logs */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ProblemsTable />
          <LogsTable limit={20} />
        </div>
      </div>
    </div>
  );
}
