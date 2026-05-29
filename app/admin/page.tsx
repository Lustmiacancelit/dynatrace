import AdminPanel from "@/components/AdminPanel";
import AppNav from "@/components/AppNav";
import { requireAdmin } from "@/lib/auth";

export default function AdminPage() {
  const session = requireAdmin();

  return (
    <div className="min-h-screen bg-[#081018] text-white">
      <AppNav session={session} />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[#e6f15a]">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Approve customer access</h1>
        </div>
        <AdminPanel />
      </main>
    </div>
  );
}
