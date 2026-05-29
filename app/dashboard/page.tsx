import DQLChat from "@/components/DQLChat";
import AppNav from "@/components/AppNav";
import { requireSession } from "@/lib/auth";

export default function DashboardPage() {
  const session = requireSession();

  return (
    <div className="h-screen overflow-hidden bg-[#010409]">
      <AppNav session={session} />
      <div className="h-[calc(100vh-57px)]">
        <DQLChat />
      </div>
    </div>
  );
}
