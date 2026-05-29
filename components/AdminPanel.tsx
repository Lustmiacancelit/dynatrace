"use client";

import { useEffect, useState } from "react";
import type { AccessRequest } from "@/lib/supabase";

export default function AdminPanel() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadRequests() {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/requests");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load requests.");
      setRequests(data.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load requests.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function approve(id: string) {
    setMessage("");
    setError("");
    const res = await fetch("/api/admin/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Approval failed.");
      return;
    }
    setMessage(data.message || "Access approved.");
    loadRequests();
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101820] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Access requests</h2>
          <p className="text-sm text-slate-400">Approve customers and send their login email.</p>
        </div>
        <button onClick={loadRequests} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:border-[#e6f15a] hover:text-[#e6f15a]">
          Refresh
        </button>
      </div>

      {error && <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p>}
      {message && <p className="mt-4 rounded-lg border border-[#e6f15a]/30 bg-[#e6f15a]/10 px-3 py-2 text-sm text-[#f4ff9a]">{message}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="py-3 pr-4">Email</th>
              <th className="py-3 pr-4">Name</th>
              <th className="py-3 pr-4">Company</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Requested</th>
              <th className="py-3 pr-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-slate-200">
            {isLoading ? (
              <tr><td className="py-5 text-slate-400" colSpan={6}>Loading requests...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td className="py-5 text-slate-400" colSpan={6}>No requests yet.</td></tr>
            ) : (
              requests.map((request) => (
                <tr key={request.id}>
                  <td className="py-3 pr-4 font-mono text-xs">{request.email}</td>
                  <td className="py-3 pr-4">{request.name || "-"}</td>
                  <td className="py-3 pr-4">{request.company || "-"}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-md bg-white/10 px-2 py-1 text-xs">{request.status}</span>
                  </td>
                  <td className="py-3 pr-4 text-slate-400">{new Date(request.created_at).toLocaleString()}</td>
                  <td className="py-3 pr-4">
                    <button
                      disabled={request.status === "approved"}
                      onClick={() => approve(request.id)}
                      className="rounded-lg bg-[#e6f15a] px-3 py-2 text-xs font-semibold text-[#0b1117] transition hover:bg-[#f2ff75] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Approve
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
