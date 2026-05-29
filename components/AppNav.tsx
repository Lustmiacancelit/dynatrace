import Link from "next/link";
import type { Session } from "@/lib/auth";

export default function AppNav({ session }: { session: Session }) {
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#071017] px-5 py-3 text-sm text-slate-300">
      <Link href="/dashboard" className="font-semibold text-white">
        DQL Builder
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dashboard" className="transition hover:text-[#e6f15a]">Builder</Link>
        <Link href="/dashboard/docs" className="transition hover:text-[#e6f15a]">Docs</Link>
        {session.role === "admin" && <Link href="/admin" className="transition hover:text-[#e6f15a]">Admin</Link>}
        <span className="hidden text-slate-500 sm:inline">{session.email}</span>
        <form action="/api/auth/logout" method="post">
          <button className="rounded-lg border border-white/10 px-3 py-1.5 transition hover:border-[#e6f15a] hover:text-[#e6f15a]">
            Log out
          </button>
        </form>
      </div>
    </nav>
  );
}
