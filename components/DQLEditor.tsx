"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

interface DQLEditorProps {
  value: string;
  onChange: (val: string) => void;
  onRun: () => void;
  onExplain: () => void;
  isRunning: boolean;
  isExplaining: boolean;
  source?: "dynatrace" | "claude";
}

export default function DQLEditor({
  value,
  onChange,
  onRun,
  onExplain,
  isRunning,
  isExplaining,
  source,
}: DQLEditorProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInDynatrace = () => {
    const encoded = encodeURIComponent(value);
    window.open(
      `https://bjk48181.apps.dynatrace.com/ui/apps/dynatrace.logs/#query=${encoded}`,
      "_blank"
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#1e2d3d] bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-[#1e2d3d] bg-[#0a0e14] px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#4aaeff] opacity-70">
            {t("dql.query")}
          </span>
          {source && (
            <span
              className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${
                source === "dynatrace"
                  ? "border-[#b060ff] bg-[#b060ff10] text-[#b060ff]"
                  : "border-[#4aaeff] bg-[#4aaeff10] text-[#4aaeff]"
              }`}
            >
              via {source === "dynatrace" ? "Dynatrace" : "Claude"}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="font-mono text-[11px] text-[#8b949e] transition-colors hover:text-white"
        >
          {copied ? t("dql.copied") : t("dql.copy")}
        </button>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[120px] w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-[#e6edf3] outline-none"
        spellCheck={false}
        placeholder={t("dql.placeholder")}
      />

      <div className="flex flex-wrap gap-2 border-t border-[#1e2d3d] bg-[#0a0e14] px-4 py-3">
        <button
          onClick={onRun}
          disabled={isRunning || !value.trim()}
          className="flex items-center gap-2 rounded-lg bg-[#238636] px-4 py-1.5 font-mono text-sm text-white transition-colors hover:bg-[#2ea043] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isRunning ? (
            <>
              <span className="animate-spin text-xs">o</span> {t("dql.running")}
            </>
          ) : (
            <>{`> ${t("dql.run")}`}</>
          )}
        </button>
        <button
          onClick={handleOpenInDynatrace}
          disabled={!value.trim()}
          className="flex items-center gap-2 rounded-lg border border-[#30363d] px-4 py-1.5 font-mono text-sm text-[#8b949e] transition-colors hover:border-[#238636] hover:text-[#7ee787] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("dql.openDynatrace")}
        </button>
        <button
          onClick={onExplain}
          disabled={isExplaining || !value.trim()}
          className="flex items-center gap-2 rounded-lg border border-[#30363d] px-4 py-1.5 font-mono text-sm text-[#8b949e] transition-colors hover:border-[#4aaeff] hover:text-[#4aaeff] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isExplaining ? (
            <>
              <span className="animate-spin text-xs">o</span> {t("dql.explaining")}
            </>
          ) : (
            <>? {t("dql.explain")}</>
          )}
        </button>
      </div>
    </div>
  );
}
