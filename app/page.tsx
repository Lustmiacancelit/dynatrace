import Link from "next/link";
import AuthForms from "@/components/AuthForms";
import { getSession } from "@/lib/auth";

const FEATURES = [
  "Plain-English prompts to production-ready DQL",
  "Screenshot uploads for log views and dashboard context",
  "Editable queries with one-click Dynatrace launch",
  "Claude explanations for every generated query",
];

export default function Home() {
  const session = getSession();

  return (
    <main className="min-h-screen overflow-hidden bg-[#081018] text-white">
      <section className="relative min-h-screen px-5 py-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(230,241,90,0.18),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(54,109,129,0.22),transparent_32%),linear-gradient(135deg,#081018,#101820_50%,#0b1117)]" />
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:48px_48px]" />

        <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#e6f15a]">FlowLog</p>
              <h1 className="mt-1 text-lg font-semibold">Dynatrace DQL Builder</h1>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {session ? (
                <Link className="rounded-lg bg-white px-4 py-2 font-semibold text-[#081018] transition hover:bg-[#e6f15a]" href="/dashboard">
                  Open dashboard
                </Link>
              ) : (
                <Link className="rounded-lg border border-white/15 px-4 py-2 text-slate-200 transition hover:border-[#e6f15a] hover:text-[#e6f15a]" href="/login">
                  Log in
                </Link>
              )}
            </div>
          </header>

          <div className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="mb-5 inline-flex rounded-md border border-[#e6f15a]/30 bg-[#e6f15a]/10 px-3 py-1 text-sm text-[#f3ff8d]">
                Approval-only access for Dynatrace query workflows
              </p>
              <h2 className="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-tight sm:text-6xl">
                Build DQL from the incident you are looking at.
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                Describe the signal, paste a screenshot, and get a query you can run directly in Dynatrace.
                Admins approve each customer before login access is issued.
              </p>

              <div className="mt-10 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {FEATURES.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 text-sm leading-6 text-slate-200">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e6f15a]" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            <AuthForms />
          </div>

          <footer className="flex flex-wrap justify-between gap-3 border-t border-white/10 pt-5 text-xs text-slate-500">
            <span>support@flowlog.dev</span>
            <span>Hosted at dynatrace.flowlog.dev</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
