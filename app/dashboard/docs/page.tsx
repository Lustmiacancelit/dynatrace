import fs from "fs";
import path from "path";
import { requireSession } from "@/lib/auth";

export default function DocsPage() {
  requireSession();
  const html = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf8");

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#6366f1]">FlowLog</p>
          <h1 className="mt-1 text-2xl font-semibold">DQL Cheat Sheet</h1>
        </div>
        <a
          href="/dashboard/builder"
          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:border-[#6366f1] hover:text-[#818cf8]"
        >
          Open Builder
        </a>
      </div>
      <iframe
        title="DQL cheat sheet"
        srcDoc={html}
        className="h-[calc(100vh-180px)] w-full border-0 bg-transparent"
      />
    </div>
  );
}
