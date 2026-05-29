import fs from "fs";
import path from "path";
import AppNav from "@/components/AppNav";
import { requireSession } from "@/lib/auth";

export default function DocsPage() {
  const session = requireSession();
  const html = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf8");

  return (
    <div className="min-h-screen bg-[#081018] text-white">
      <AppNav session={session} />
      <main className="mx-auto max-w-7xl px-5 py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#e6f15a]">Docs</p>
            <h1 className="mt-2 text-2xl font-semibold">DQL cheat sheet</h1>
          </div>
          <a href="/dashboard" className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:border-[#e6f15a] hover:text-[#e6f15a]">
            Back to builder
          </a>
        </div>
        <iframe
          title="DQL cheat sheet"
          srcDoc={html}
          className="h-[calc(100vh-150px)] w-full rounded-2xl border border-white/10 bg-white"
        />
      </main>
    </div>
  );
}
