"use client";
// components/DQLChat.tsx

import { useState, useRef, useEffect } from "react";
import DQLEditor from "./DQLEditor";
import ExplanationPanel from "./ExplanationPanel";

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
  isError?: boolean;
  collapsed?: boolean;
}

const SUGGESTIONS = [
  "Show all error logs in the last hour",
  "Find the slowest services by response time",
  "Show HTTP 5xx errors grouped by service",
  "CPU usage for all hosts in the last 30 minutes",
  "Kubernetes pod restarts in the last 24 hours",
  "Show failed deployments today",
];

export default function DQLChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<{ base64: string; mediaType: string; preview: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateId = () => Math.random().toString(36).slice(2);

  const toggleCollapse = (id: string) => {
    setMessages((prev) =>
      prev.map((m) => m.id === id ? { ...m, collapsed: !m.collapsed } : m)
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPendingImage({ base64: result.split(",")[1], mediaType: file.type, preview: result });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          setPendingImage({ base64: result.split(",")[1], mediaType: item.type, preview: result });
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  const handleSubmit = async (prompt: string) => {
    const finalPrompt = prompt.trim() || (pendingImage ? "What DQL query should I use based on this screenshot?" : "");
    if (!finalPrompt && !pendingImage || isGenerating) return;

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

    let userContent: string | Array<{ type: string; [key: string]: unknown }> = finalPrompt;
    if (pendingImage) {
      userContent = [
        { type: "image", source: { type: "base64", media_type: pendingImage.mediaType, data: pendingImage.base64 } },
        { type: "text", text: finalPrompt },
      ];
    }

    const newHistory: ChatMessage[] = [...chatHistory, { role: "user", content: userContent }];
    const imagePayload = pendingImage ? { base64: pendingImage.base64, mediaType: pendingImage.mediaType } : null;
    setPendingImage(null);

    try {
      const res = await fetch("/api/dql-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt, history: newHistory, image: imagePayload }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: data.error, isError: true } : m)
        );
        setChatHistory([...newHistory, { role: "assistant", content: data.error }]);
      } else {
        const assistantReply = `Here's the DQL query:\n\`\`\`\n${data.dql}\n\`\`\``;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: data.message || "Here's the DQL query for that:", dql: data.dql, dqlSource: data.source }
              : m
          )
        );
        setChatHistory([...newHistory, { role: "assistant", content: assistantReply }]);
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: "Network error. Please try again.", isError: true } : m
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDqlChange = (id: string, newDql: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, dql: newDql } : m)));
  };

  const handleExplain = async (id: string, query: string) => {
    setExplainingId(id);
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, explanation: undefined } : m));
    try {
      const res = await fetch("/api/dql-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, explanation: data.explanation ?? data.error, explanationSource: data.source }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) => m.id === id ? { ...m, explanation: "Failed to explain query." } : m)
      );
    } finally {
      setExplainingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#010409] text-[#e6edf3]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d3d] bg-[#0a0e14]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4aaeff] to-[#b060ff] flex items-center justify-center text-xs font-bold">
            DQ
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">DQL Builder</h1>
            <p className="text-[10px] text-[#8b949e] font-mono">dynatrace.flowlog.dev</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setChatHistory([]); }}
              className="text-[11px] font-mono text-[#8b949e] hover:text-[#f85149] transition-colors"
            >
              clear chat
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#238636] animate-pulse" />
            <span className="text-[11px] font-mono text-[#8b949e]">connected</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 w-full max-w-4xl mx-auto">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-8 py-16">
            <div className="text-center">
              <div className="text-4xl mb-4">⬡</div>
              <h2 className="text-xl font-semibold text-[#e6edf3] mb-2">Ask in plain English</h2>
              <p className="text-sm text-[#8b949e] max-w-sm">
                Describe what you need, paste a screenshot, or upload an image of your Dynatrace logs.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSubmit(s)}
                  className="text-left text-xs font-mono px-3 py-2.5 rounded-lg border border-[#1e2d3d] bg-[#0d1117] hover:border-[#4aaeff]/50 hover:text-[#4aaeff] text-[#8b949e] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-3 items-start">
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 mt-1 ${
              msg.role === "assistant"
                ? "bg-gradient-to-br from-[#4aaeff] to-[#b060ff]"
                : "bg-[#1f6feb]"
            }`}>
              {msg.role === "assistant" ? "DQ" : "U"}
            </div>

            {/* Content */}
            <div className="flex flex-col gap-3 flex-1 min-w-0">

              {/* Screenshot preview */}
              {msg.imagePreview && (
                <div className="rounded-xl overflow-hidden border border-[#1e2d3d] max-w-sm">
                  <img src={msg.imagePreview} alt="Screenshot" className="w-full h-auto" />
                </div>
              )}

              {/* Message bubble — collapsible for user messages with long content */}
              <div className={`rounded-xl border text-sm leading-relaxed overflow-hidden ${
                msg.isError
                  ? "border-[#f85149]/40 bg-[#1a0a0a]"
                  : msg.role === "user"
                  ? "border-[#1f6feb]/30 bg-[#1f2d4a]"
                  : "border-[#1e2d3d] bg-[#161b22]"
              }`}>
                {/* Collapse header for long user messages */}
                {msg.role === "user" && msg.content.length > 120 ? (
                  <>
                    <div
                      className="flex items-center justify-between px-4 py-2 cursor-pointer select-none border-b border-[#1f6feb]/20"
                      onClick={() => toggleCollapse(msg.id)}
                    >
                      <span className="text-xs font-mono text-[#4aaeff] opacity-70">
                        {msg.collapsed ? "▶ Show message" : "▼ Hide message"}
                      </span>
                      <span className="text-[10px] text-[#8b949e]">
                        {msg.collapsed ? msg.content.slice(0, 60) + "..." : ""}
                      </span>
                    </div>
                    {!msg.collapsed && (
                      <div className="px-4 py-3 text-[#e6edf3] whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </>
                ) : (
                  <div className={`px-4 py-3 ${msg.isError ? "text-[#f85149]" : "text-[#e6edf3]"} whitespace-pre-wrap`}>
                    {msg.content || (
                      <span className="flex gap-1 items-center text-[#8b949e]">
                        <span className="animate-bounce" style={{animationDelay:"0ms"}}>·</span>
                        <span className="animate-bounce" style={{animationDelay:"100ms"}}>·</span>
                        <span className="animate-bounce" style={{animationDelay:"200ms"}}>·</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* DQL Editor — collapsible */}
              {msg.dql !== undefined && (
                <div>
                  <DQLEditor
                    value={msg.dql}
                    onChange={(val) => handleDqlChange(msg.id, val)}
                    onRun={() => {}}
                    onExplain={() => handleExplain(msg.id, msg.dql!)}
                    isRunning={false}
                    isExplaining={explainingId === msg.id}
                    source={msg.dqlSource}
                  />
                </div>
              )}

              {/* Explanation — collapsible */}
              {msg.explanation && (
                <ExplanationPanel explanation={msg.explanation} source={msg.explanationSource} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Pending image preview */}
      {pendingImage && (
        <div className="px-4 pb-2 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3 bg-[#0d1117] border border-[#1e2d3d] rounded-lg px-3 py-2">
            <img src={pendingImage.preview} alt="Pending" className="w-12 h-12 object-cover rounded" />
            <span className="text-xs text-[#8b949e] font-mono flex-1">Screenshot ready — add a message or just send</span>
            <button onClick={() => setPendingImage(null)} className="text-[#8b949e] hover:text-[#f85149] transition-colors text-sm">✕</button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-4 border-t border-[#1e2d3d] bg-[#0a0e14]">
        <div className="max-w-4xl mx-auto">
          <div
            className="flex gap-2 items-end rounded-xl border border-[#1e2d3d] bg-[#0d1117] focus-within:border-[#4aaeff]/50 transition-colors px-4 py-3"
            onPaste={handlePaste}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 w-7 h-7 rounded-lg border border-[#1e2d3d] hover:border-[#4aaeff]/50 hover:text-[#4aaeff] text-[#8b949e] flex items-center justify-center transition-colors"
              title="Upload screenshot"
            >
              📎
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Describe what you need, or paste/upload a screenshot..."
              className="flex-1 bg-transparent text-sm text-[#e6edf3] placeholder-[#8b949e] outline-none resize-none font-mono leading-relaxed"
              style={{ maxHeight: "120px" }}
            />
            <button
              onClick={() => handleSubmit(input)}
              disabled={(!input.trim() && !pendingImage) || isGenerating}
              className="shrink-0 w-8 h-8 rounded-lg bg-[#1f6feb] hover:bg-[#388bfd] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              {isGenerating ? <span className="animate-spin text-xs">◌</span> : <span className="text-xs">↑</span>}
            </button>
          </div>
          <p className="text-[10px] text-[#8b949e] text-center mt-2 font-mono">
            Enter to send · Shift+Enter for new line · Paste or upload screenshots · Claude remembers context
          </p>
        </div>
      </div>
    </div>
  );
}
