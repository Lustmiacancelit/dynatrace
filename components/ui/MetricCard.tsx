import type { ReactNode } from "react";

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  alert?: boolean;
  icon?: ReactNode;
};

export default function MetricCard({ title, value, subtitle, alert, icon }: Props) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        alert ? "border-red-500/40 bg-[#1e293b]" : "border-white/10 bg-[#1e293b]"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{title}</p>
        {icon && <span className="text-slate-600">{icon}</span>}
      </div>
      <p
        className={`mt-2 text-3xl font-semibold tabular-nums ${
          alert ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </p>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}
