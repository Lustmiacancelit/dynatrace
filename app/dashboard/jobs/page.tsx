import { requireSession } from "@/lib/auth";
import JobsMetricsDashboard from "@/components/ui/JobsMetricsDashboard";

export default function JobsPage() {
  requireSession();
  return <JobsMetricsDashboard />;
}
