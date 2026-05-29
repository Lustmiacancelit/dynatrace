import { hashValue } from "./auth";

export type AccessRequest = {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  status: "pending" | "approved" | "rejected";
  is_admin: boolean;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  login_token_hash: string | null;
  login_token_expires_at: string | null;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return { url: url.replace(/\/$/, ""), key };
}

async function supabaseFetch(path: string, init: RequestInit = {}) {
  const { url, key } = getSupabaseConfig();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Supabase request failed: ${res.status} ${detail}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function upsertAccessRequest(input: {
  email: string;
  name?: string;
  company?: string;
  isAdmin?: boolean;
}) {
  const rows = await supabaseFetch("access_requests?on_conflict=email", {
    method: "POST",
    body: JSON.stringify({
      email: input.email.toLowerCase(),
      name: input.name || null,
      company: input.company || null,
      status: input.isAdmin ? "approved" : "pending",
      is_admin: Boolean(input.isAdmin),
      approved_at: input.isAdmin ? new Date().toISOString() : null,
      approved_by: input.isAdmin ? "system" : null,
    }),
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
  });
  return rows?.[0] as AccessRequest;
}

export async function listAccessRequests() {
  return (await supabaseFetch("access_requests?select=*&order=created_at.desc")) as AccessRequest[];
}

export async function findAccessRequestByEmail(email: string) {
  const rows = (await supabaseFetch(
    `access_requests?select=*&email=eq.${encodeURIComponent(email.toLowerCase())}&limit=1`
  )) as AccessRequest[];
  return rows[0] || null;
}

export async function approveAccessRequest(id: string, approverEmail: string, loginToken: string) {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  const rows = await supabaseFetch(`access_requests?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: approverEmail,
      login_token_hash: hashValue(loginToken),
      login_token_expires_at: expiresAt,
    }),
  });
  return rows?.[0] as AccessRequest;
}

export async function consumeLoginToken(email: string, token: string) {
  const request = await findAccessRequestByEmail(email);
  if (!request || request.status !== "approved" || !request.login_token_hash) return null;
  if (request.login_token_hash !== hashValue(token)) return null;
  if (request.login_token_expires_at && new Date(request.login_token_expires_at).getTime() < Date.now()) return null;

  await supabaseFetch(`access_requests?id=eq.${encodeURIComponent(request.id)}`, {
    method: "PATCH",
    body: JSON.stringify({ login_token_hash: null, login_token_expires_at: null }),
  });

  return request;
}
