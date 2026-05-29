"use client";

import { useEffect, useState } from "react";

type Mode = "register" | "login";

export default function AuthForms({ initialMode = "register" }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const tokenEmail = params.get("email");
    if (!token || !tokenEmail) return;

    setIsLoading(true);
    fetch("/api/auth/consume-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: tokenEmail, token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Login link is invalid.");
        window.location.href = "/dashboard";
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  async function submit(path: string, body: Record<string, string>) {
    setIsLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed.");
      if (data.redirectTo) {
        window.location.href = data.redirectTo;
        return;
      }
      setMessage(data.message || "Request received.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-[#101820]/85 p-5 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="grid grid-cols-2 rounded-xl bg-black/25 p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`rounded-lg px-3 py-2 transition ${mode === "register" ? "bg-[#e6f15a] text-[#0b1117]" : "text-slate-300 hover:text-white"}`}
        >
          Request access
        </button>
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-lg px-3 py-2 transition ${mode === "login" ? "bg-[#e6f15a] text-[#0b1117]" : "text-slate-300 hover:text-white"}`}
        >
          Log in
        </button>
      </div>

      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (mode === "register") {
            submit("/api/auth/register", { email, name, company });
          } else {
            submit("/api/auth/login", { email, password });
          }
        }}
      >
        {mode === "register" && (
          <>
            <label className="block text-sm text-slate-300">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-white outline-none transition focus:border-[#e6f15a]"
              />
            </label>
            <label className="block text-sm text-slate-300">
              Company
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-white outline-none transition focus:border-[#e6f15a]"
              />
            </label>
          </>
        )}

        <label className="block text-sm text-slate-300">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-white outline-none transition focus:border-[#e6f15a]"
          />
        </label>

        {mode === "login" && (
          <label className="block text-sm text-slate-300">
            Admin password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Only required for admins"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-white outline-none transition focus:border-[#e6f15a]"
            />
          </label>
        )}

        {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p>}
        {message && <p className="rounded-lg border border-[#e6f15a]/30 bg-[#e6f15a]/10 px-3 py-2 text-sm text-[#f4ff9a]">{message}</p>}

        <button
          disabled={isLoading}
          className="w-full rounded-xl bg-[#e6f15a] px-4 py-3 font-semibold text-[#0b1117] transition hover:bg-[#f2ff75] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Working..." : mode === "register" ? "Send request" : "Continue"}
        </button>

        {mode === "login" && (
          <p className="text-xs leading-5 text-slate-400">
            Approved customers sign in from the email link sent after approval. Admins can use the shared admin password.
          </p>
        )}
      </form>
    </div>
  );
}
