"use client";
// components/ExplanationPanel.tsx

interface ExplanationPanelProps {
  explanation: string | null;
  source?: "dynatrace" | "claude";
}

export default function ExplanationPanel({
  explanation,
  source,
}: ExplanationPanelProps) {
  if (!explanation) return null;

  return (
    <div className="rounded-xl border border-[#b060ff]/30 bg-[#b060ff08] p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#b060ff] opacity-80">
          Explanation
        </span>
        {source && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[#b060ff]/30 text-[#b060ff]/60">
            via {source === "dynatrace" ? "Dynatrace" : "Claude"}
          </span>
        )}
      </div>
      <p className="text-sm text-[#cdd9e5] leading-relaxed">{explanation}</p>
    </div>
  );
}
