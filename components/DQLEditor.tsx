"use client";
// components/DQLEditor.tsx

import { useState } from "react";

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
    <div className="rounded-xl border border-[#1e2d3d] bg-[#0d1117] overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e2d3d] bg-[#0a0e14]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#4aaeff] opacity-70">
            DQL Query
          </span>
          {source && (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                source === "dynatrace"
                  ? "border-[#b060ff] text-[#b060ff] bg-[#b060ff10]"
                  : "border-[#4aaeff] text-[#4aaeff] bg-[#4aaeff10]"
              }`}
            >
              via {source === "dynatrace" ? "Dynatrace" : "Claude"}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="text-[11px] font-mono text-[#8b949e] hover:text-white transition-colors"
        >
          {copied ? "✓ copied" : "copy"}
        </button>
      </div>

      {/* Editor */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-[#e6edf3] font-mono text-sm p-4 outline-none resize-none min-h-[120px] leading-relaxed"
        spellCheck={false}
        placeholder="DQL query will appear here..."
      />

      {/* Action buttons */}
      <div className="flex gap-2 px-4 py-3 border-t border-[#1e2d3d] bg-[#0a0e14]">
        <button
          onClick={onRun}
          disabled={isRunning || !value.trim()}
          className="flex items-center gap-2 px-4 py-1.5 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-mono rounded-lg transition-colors"
        >
          {isRunning ? (
            <>
              <span className="animate-spin text-xs">○</span> Running...
            </>
          ) : (
            <>▶ Run in FlowLog</>
          )}
        </button>
        <button
          onClick={handleOpenInDynatrace}
          disabled={!value.trim()}
          className="flex items-center gap-2 px-4 py-1.5 border border-[#30363d] hover:border-[#238636] hover:text-[#7ee787] disabled:opacity-40 disabled:cursor-not-allowed text-[#8b949e] text-sm font-mono rounded-lg transition-colors"
        >
          Open in Dynatrace
        </button>
        <button
          onClick={onExplain}
          disabled={isExplaining || !value.trim()}
          className="flex items-center gap-2 px-4 py-1.5 border border-[#30363d] hover:border-[#4aaeff] hover:text-[#4aaeff] disabled:opacity-40 disabled:cursor-not-allowed text-[#8b949e] text-sm font-mono rounded-lg transition-colors"
        >
          {isExplaining ? (
            <>
              <span className="animate-spin text-xs">◌</span> Explaining...
            </>
          ) : (
            <>? Explain</>
          )}
        </button>
      </div>
    </div>
  );
}
