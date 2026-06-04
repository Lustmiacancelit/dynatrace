import { requireSession } from "@/lib/auth";
import LogDiffWorkspace from "@/components/log-diff/LogDiffWorkspace";

export default function LogDiffPage() {
  requireSession();
  return <LogDiffWorkspace />;
}
