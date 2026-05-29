import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const ADMIN_EMAILS = [
  "fabio.almeida@pinvestcapital.com",
  "support@flowlog.dev",
];

export type Session = {
  email: string;
  role: "admin" | "user";
};

const COOKIE_NAME = "dql_session";
const DEFAULT_ADMIN_PASSWORD = "Mi@99fabfep$$&&";

function getSecret() {
  return process.env.APP_SECRET || process.env.NEXTAUTH_SECRET || "dev-only-change-before-production";
}

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
}

export function isAdminEmail(email: string) {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function createToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashValue(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

function signPayload(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function encodeSession(session: Session) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

export function decodeSession(value?: string): Session | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = signPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed.email || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSessionCookie(session: Session) {
  cookies().set(COOKIE_NAME, encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export function getSession() {
  return decodeSession(cookies().get(COOKIE_NAME)?.value);
}

export function requireSession() {
  const session = getSession();
  if (!session) redirect("/login");
  return session;
}

export function requireAdmin() {
  const session = requireSession();
  if (session.role !== "admin") redirect("/dashboard");
  return session;
}
