import { requireSession } from "@/lib/auth";
import { getProblems } from "@/lib/dynatrace";
import ProblemsTable from "@/components/ui/ProblemsBadge";
import MetricCard from "@/components/ui/MetricCard";
import { AlertTriangle, Activity } from "lucide-react";

export default async function ProblemsPage() {
  requireSession();

  let totalCount = 0;
  try {
    const data = await getProblems();
    totalCount = data.totalCount;
  } catch {
    // shown by ProblemsTable client component
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#6366f1]">FlowLog Observability</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Problems</h1>
          <p className="mt-1 text-sm text-slate-400">Active incidents and anomalies detected by Dynatrace Davis AI</p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            title="Open Problems"
            value={totalCount}
            subtitle="Detected by Davis AI"
            alert={totalCount > 0}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <MetricCard
            title="Status"
            value={totalCount === 0 ? "Healthy" : "Degraded"}
            subtitle="Environment health"
            alert={totalCount > 0}
            icon={<Activity className="h-4 w-4" />}
          />
        </div>

        <ProblemsTable />
      </div>
    </div>
  );
}
