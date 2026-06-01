import { requireSession } from "@/lib/auth";
import Sidebar from "@/components/ui/Sidebar";
import TopBar from "@/components/ui/TopBar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = requireSession();
  const envUrl = process.env.DYNATRACE_ENV_URL ?? "";
  const envId = envUrl.replace("https://", "").replace(".live.dynatrace.com", "") || "-";

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f172a] text-white">
      <Sidebar role={session.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar email={session.email} envId={envId} />
        {/* Individual pages control their own overflow */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
