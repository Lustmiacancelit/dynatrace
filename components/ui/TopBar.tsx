"use client";

import { LanguageSwitcher, useLanguage } from "@/components/LanguageProvider";

export default function TopBar({ email, envId }: { email: string; envId: string }) {
  const { t } = useLanguage();

  return (
    <header className="flex flex-shrink-0 items-center justify-between border-b border-white/10 bg-[#0b1117] px-6 py-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-xs uppercase tracking-widest text-slate-600">{t("top.env")}</span>
        <code className="rounded bg-white/5 px-2 py-0.5 font-mono text-xs text-slate-300">
          {envId}
        </code>
      </div>
      <div className="flex items-center gap-4">
        <LanguageSwitcher compact />
        <span className="hidden text-sm text-slate-400 sm:block">{email}</span>
        <form action="/api/auth/logout" method="post">
          <button className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-[#6366f1] hover:text-[#818cf8]">
            {t("common.logout")}
          </button>
        </form>
      </div>
    </header>
  );
}
