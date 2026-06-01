import { requireSession } from "@/lib/auth";
import KubernetesNodeDashboard from "@/components/ui/KubernetesNodeDashboard";

export default function MetricsPage() {
  requireSession();
  return (
    <div className="h-full overflow-auto bg-[#120b1f] p-6">
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#a78bfa]">Dynatrace ready-made</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Kubernetes node - pods</h1>
          <p className="mt-1 text-sm text-slate-400">
            Pinvest EKS node utilization from the same Kubernetes metric family used by Dynatrace.
          </p>
        </div>

        <KubernetesNodeDashboard />
      </div>
    </div>
  );
}
