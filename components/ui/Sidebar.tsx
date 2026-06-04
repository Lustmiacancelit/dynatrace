"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart2,
  FileText,
  AlertTriangle,
  Terminal,
  BookOpen,
  ShieldAlert,
  Network,
  BriefcaseBusiness,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

const NAV = [
  { href: "/dashboard", labelKey: "nav.overview", icon: Activity, exact: true },
  { href: "/dashboard/metrics", labelKey: "nav.metrics", icon: BarChart2 },
  { href: "/dashboard/jobs", labelKey: "nav.jobs", icon: BriefcaseBusiness },
  { href: "/dashboard/logs", labelKey: "nav.logs", icon: FileText },
  { href: "/dashboard/traces", labelKey: "nav.traces", icon: Network },
  { href: "/dashboard/problems", labelKey: "nav.problems", icon: AlertTriangle },
  { href: "/dashboard/builder", labelKey: "nav.builder", icon: Terminal },
  { href: "/dashboard/diff", labelKey: "nav.diff", icon: FileText },
  { href: "/dashboard/docs", labelKey: "nav.docs", icon: BookOpen },
];

export default function Sidebar({ role }: { role: "admin" | "user" }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="flex w-56 flex-shrink-0 flex-col border-r border-white/10 bg-[#0b1117]">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#6366f1]" />
          <span className="font-semibold text-white">FlowLog</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">{t("brand.observability")}</p>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {NAV.map(({ href, labelKey, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive(href, exact)
                ? "bg-[#6366f1]/15 text-[#818cf8]"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {t(labelKey)}
          </Link>
        ))}
        {role === "admin" && (
          <Link
            href="/admin"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              pathname.startsWith("/admin")
                ? "bg-[#6366f1]/15 text-[#818cf8]"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <ShieldAlert className="h-4 w-4 flex-shrink-0" />
            {t("nav.admin")}
          </Link>
        )}
      </nav>

      <div className="border-t border-white/10 px-4 py-3">
        <p className="text-[10px] text-slate-600">dynatrace.flowlog.dev</p>
      </div>
    </aside>
  );
}
