import { requireSession } from "@/lib/auth";
import TraceExplorer from "@/components/ui/TraceExplorer";

export default function TracesPage() {
  requireSession();
  return <TraceExplorer />;
}
