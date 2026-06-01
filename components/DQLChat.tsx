"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import DQLEditor from "./DQLEditor";
import ExplanationPanel from "./ExplanationPanel";
import ResultsTable from "./ResultsTable";

interface ChatMessage {
  role: "user" | "assistant";
  content: string | Array<{ type: string; [key: string]: unknown }>;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imagePreview?: string;
  dql?: string;
  dqlSource?: "dynatrace" | "claude";
  explanation?: string;
  explanationSource?: "dynatrace" | "claude";
  results?: Record<string, unknown> | null;
  resultsError?: string;
  isError?: boolean;
  collapsed?: boolean;
}

const SUGGESTIONS = [
  "Show all error logs in the last hour",
  "Mostrar todos los logs de error en la ultima hora",
  "Mostrar todos os logs de erro na ultima hora",
  "Find the slowest services by response time",
  "Show HTTP 5xx errors grouped by service",
  "Kubernetes pod restarts in the last 24 hours",
];

export default function DQLChat() {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<{
    base64: string;
    mediaType: string;
    preview: string;
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateId = () => Math.random().toString(36).slice(2);

  const toggleCollapse = (id: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id ? { ...message, collapsed: !message.collapsed } : message
      )
    );
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPendingImage({
        base64: result.split(",")[1],
        mediaType: file.type,
        preview: result,
      });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    for (const item of Array.from(event.clipboardData.items)) {
      if (!item.type.startsWith("image/")) continue;
      const file = item.getAsFile();
      if (!file) continue;

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setPendingImage({
          base64: result.split(",")[1],
          mediaType: item.type,
          preview: result,
        });
      };
      reader.readAsDataURL(file);
      break;
    }
  };

  const handleSubmit = async (prompt: string) => {
    const finalPrompt =
      prompt.trim() || (pendingImage ? "What DQL query should I use based on this screenshot?" : "");
    if ((!finalPrompt && !pendingImage) || isGenerating) return;

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: finalPrompt,
      imagePreview: pendingImage?.preview,
    };
    const assistantId = generateId();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "" };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsGenerating(true);

    let userContent: ChatMessage["content"] = finalPrompt;
    if (pendingImage) {
      userContent = [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: pendingImage.mediaType,
            data: pendingImage.base64,
          },
        },
        { type: "text", text: finalPrompt },
      ];
    }

    const newHistory: ChatMessage[] = [...chatHistory, { role: "user", content: userContent }];
    const imagePayload = pendingImage
      ? { base64: pendingImage.base64, mediaType: pendingImage.mediaType }
      : null;
    setPendingImage(null);

    try {
      const res = await fetch("/api/dql-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt, history: newHistory, image: imagePayload, language }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? { ...message, content: data.error, isError: true }
              : message
          )
        );
        setChatHistory([...newHistory, { role: "assistant", content: data.error }]);
        return;
      }

      const assistantReply = `DQL query:\n\`\`\`\n${data.dql}\n\`\`\``;
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: data.message || "Here's the DQL query for that:",
                dql: data.dql,
                dqlSource: data.source,
              }
            : message
        )
      );
      setChatHistory([...newHistory, { role: "assistant", content: assistantReply }]);
    } catch {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? { ...message, content: t("chat.networkError"), isError: true }
            : message
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDqlChange = (id: string, newDql: string) => {
    setMessages((prev) => prev.map((message) => (message.id === id ? { ...message, dql: newDql } : message)));
  };

  const handleExplain = async (id: string, query: string) => {
    setExplainingId(id);
    setMessages((prev) => prev.map((message) => (message.id === id ? { ...message, explanation: undefined } : message)));

    try {
      const res = await fetch("/api/dql-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, language }),
      });
      const data = await res.json();
      setMessages((prev) =>
        prev.map((message) =>
          message.id === id
            ? { ...message, explanation: data.explanation ?? data.error, explanationSource: data.source }
            : message
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === id ? { ...message, explanation: t("chat.explainError") } : message
        )
      );
    } finally {
      setExplainingId(null);
    }
  };

  const handleRun = async (id: string, query: string) => {
    setRunningId(id);
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id ? { ...message, results: null, resultsError: undefined } : message
      )
    );

    try {
      const res = await fetch("/api/dql-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, timeframeStart: "now-2h", timeframeEnd: "now" }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === id
              ? { ...message, results: null, resultsError: data.error || "DQL execution failed." }
              : message
          )
        );
        return;
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === id ? { ...message, results: data.results, resultsError: undefined } : message
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === id ? { ...message, results: null, resultsError: t("chat.runError") } : message
        )
      );
    } finally {
      setRunningId(null);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(input);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#010409] text-[#e6edf3]">
      <header className="flex items-center justify-between border-b border-[#1e2d3d] bg-[#0a0e14] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#4aaeff] to-[#b060ff] text-xs font-bold">
            DQ
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">{t("chat.title")}</h1>
            <p className="font-mono text-[10px] text-[#8b949e]">dynatrace.flowlog.dev</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button
              onClick={() => {
                setMessages([]);
                setChatHistory([]);
              }}
              className="font-mono text-[11px] text-[#8b949e] transition-colors hover:text-[#f85149]"
            >
              {t("common.clearChat")}
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#238636]" />
            <span className="font-mono text-[11px] text-[#8b949e]">{t("common.connected")}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex-1 space-y-4 overflow-y-auto px-4 py-6 w-full max-w-4xl">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-8 py-16">
            <div className="text-center">
              <div className="mb-4 text-4xl">DQL</div>
              <h2 className="mb-2 text-xl font-semibold text-[#e6edf3]">{t("chat.emptyTitle")}</h2>
              <p className="max-w-sm text-sm text-[#8b949e]">{t("chat.emptyBody")}</p>
            </div>
            <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSubmit(suggestion)}
                  className="rounded-lg border border-[#1e2d3d] bg-[#0d1117] px-3 py-2.5 text-left font-mono text-xs text-[#8b949e] transition-all hover:border-[#4aaeff]/50 hover:text-[#4aaeff]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="flex items-start gap-3">
            <div
              className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                message.role === "assistant"
                  ? "bg-gradient-to-br from-[#4aaeff] to-[#b060ff]"
                  : "bg-[#1f6feb]"
              }`}
            >
              {message.role === "assistant" ? "DQ" : "U"}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3">
              {message.imagePreview && (
                <div className="max-w-sm overflow-hidden rounded-xl border border-[#1e2d3d]">
                  <img src={message.imagePreview} alt="Screenshot" className="h-auto w-full" />
                </div>
              )}

              <div
                className={`overflow-hidden rounded-xl border text-sm leading-relaxed ${
                  message.isError
                    ? "border-[#f85149]/40 bg-[#1a0a0a]"
                    : message.role === "user"
                      ? "border-[#1f6feb]/30 bg-[#1f2d4a]"
                      : "border-[#1e2d3d] bg-[#161b22]"
                }`}
              >
                {message.role === "user" && message.content.length > 120 ? (
                  <>
                    <div
                      className="flex cursor-pointer select-none items-center justify-between border-b border-[#1f6feb]/20 px-4 py-2"
                      onClick={() => toggleCollapse(message.id)}
                    >
                      <span className="font-mono text-xs text-[#4aaeff] opacity-70">
                        {message.collapsed ? `> ${t("chat.showMessage")}` : `v ${t("chat.hideMessage")}`}
                      </span>
                      <span className="text-[10px] text-[#8b949e]">
                        {message.collapsed ? `${message.content.slice(0, 60)}...` : ""}
                      </span>
                    </div>
                    {!message.collapsed && (
                      <div className="whitespace-pre-wrap px-4 py-3 text-[#e6edf3]">{message.content}</div>
                    )}
                  </>
                ) : (
                  <div
                    className={`whitespace-pre-wrap px-4 py-3 ${
                      message.isError ? "text-[#f85149]" : "text-[#e6edf3]"
                    }`}
                  >
                    {message.content || <span className="text-[#8b949e]">...</span>}
                  </div>
                )}
              </div>

              {message.dql !== undefined && (
                <DQLEditor
                  value={message.dql}
                  onChange={(value) => handleDqlChange(message.id, value)}
                  onRun={() => handleRun(message.id, message.dql!)}
                  onExplain={() => handleExplain(message.id, message.dql!)}
                  isRunning={runningId === message.id}
                  isExplaining={explainingId === message.id}
                  source={message.dqlSource}
                />
              )}

              {(message.results || message.resultsError) && (
                <ResultsTable results={message.results ?? null} error={message.resultsError} />
              )}

              {message.explanation && (
                <ExplanationPanel explanation={message.explanation} source={message.explanationSource} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {pendingImage && (
        <div className="mx-auto w-full max-w-4xl px-4 pb-2">
          <div className="flex items-center gap-3 rounded-lg border border-[#1e2d3d] bg-[#0d1117] px-3 py-2">
            <img src={pendingImage.preview} alt="Pending" className="h-12 w-12 rounded object-cover" />
            <span className="flex-1 font-mono text-xs text-[#8b949e]">{t("chat.screenshotReady")}</span>
            <button
              onClick={() => setPendingImage(null)}
              className="text-sm text-[#8b949e] transition-colors hover:text-[#f85149]"
            >
              x
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-[#1e2d3d] bg-[#0a0e14] px-4 py-4">
        <div className="mx-auto max-w-4xl">
          <div
            className="flex items-end gap-2 rounded-xl border border-[#1e2d3d] bg-[#0d1117] px-4 py-3 transition-colors focus-within:border-[#4aaeff]/50"
            onPaste={handlePaste}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#1e2d3d] text-[#8b949e] transition-colors hover:border-[#4aaeff]/50 hover:text-[#4aaeff]"
              title="Upload screenshot"
            >
              +
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={t("chat.inputPlaceholder")}
              className="flex-1 resize-none bg-transparent font-mono text-sm leading-relaxed text-[#e6edf3] outline-none placeholder:text-[#8b949e]"
              style={{ maxHeight: "120px" }}
            />
            <button
              onClick={() => handleSubmit(input)}
              disabled={(!input.trim() && !pendingImage) || isGenerating}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1f6feb] transition-colors hover:bg-[#388bfd] disabled:cursor-not-allowed disabled:opacity-30"
            >
              {isGenerating ? <span className="animate-spin text-xs">o</span> : <span className="text-xs">^</span>}
            </button>
          </div>
          <p className="mt-2 text-center font-mono text-[10px] text-[#8b949e]">{t("chat.inputHelp")}</p>
        </div>
      </div>
    </div>
  );
}
