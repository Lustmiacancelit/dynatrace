import { ADMIN_EMAILS } from "./auth";
import type { Problem } from "./dynatrace";

const FROM_EMAIL = "FlowLog Dynatrace <support@flowlog.dev>";

async function sendResendEmail(payload: {
  to: string[];
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { skipped: true, reason: "RESEND_API_KEY is not configured." };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(payload.idempotencyKey ? { "Idempotency-Key": payload.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

export function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` ||
    "http://localhost:3009"
  );
}

export async function notifyAdminsOfRegistration(input: {
  email: string;
  name?: string;
  company?: string;
}) {
  const adminUrl = `${getAppUrl()}/admin`;
  return sendResendEmail({
    to: ADMIN_EMAILS,
    subject: "Dynatrace DQL Builder access request",
    text: `New access request\n\nEmail: ${input.email}\nName: ${input.name || "-"}\nCompany: ${input.company || "-"}\n\nApprove it here: ${adminUrl}`,
    html: `
      <h2>New Dynatrace DQL Builder access request</h2>
      <p><strong>Email:</strong> ${input.email}</p>
      <p><strong>Name:</strong> ${input.name || "-"}</p>
      <p><strong>Company:</strong> ${input.company || "-"}</p>
      <p><a href="${adminUrl}">Open admin approvals</a></p>
    `,
  });
}

export async function sendApprovedLoginEmail(input: {
  email: string;
  token: string;
}) {
  const loginUrl = `${getAppUrl()}/login?email=${encodeURIComponent(input.email)}&token=${encodeURIComponent(input.token)}`;
  return sendResendEmail({
    to: [input.email],
    subject: "Your Dynatrace DQL Builder access is approved",
    text: `Your access is approved. Sign in here: ${loginUrl}`,
    html: `
      <h2>Your access is approved</h2>
      <p>You can now sign in to the Dynatrace DQL Builder.</p>
      <p><a href="${loginUrl}">Sign in to DQL Builder</a></p>
      <p>This link expires in 7 days.</p>
    `,
  });
}

export async function sendSupportTicketEmail(input: {
  subject: string;
  priority?: string;
  message: string;
  requesterEmail?: string;
  createdAt?: string;
}) {
  const createdAt = input.createdAt || new Date().toISOString();
  return sendResendEmail({
    to: ["support@flowlog.dev"],
    subject: `FlowLog support: ${input.subject}`,
    text: `FlowLog support ticket

Subject: ${input.subject}
Priority: ${input.priority || "Medium"}
Requester: ${input.requesterEmail || "Unknown"}
Created: ${createdAt}

${input.message}
`,
    html: `
      <h2>FlowLog support ticket</h2>
      <p><strong>Subject:</strong> ${input.subject}</p>
      <p><strong>Priority:</strong> ${input.priority || "Medium"}</p>
      <p><strong>Requester:</strong> ${input.requesterEmail || "Unknown"}</p>
      <p><strong>Created:</strong> ${createdAt}</p>
      <p><strong>Message:</strong></p>
      <p>${input.message.replaceAll("\n", "<br>")}</p>
    `,
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatProblemTime(value: number) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  });
}

export async function sendDynatraceProblemAlertEmail(problem: Problem) {
  const envUrl = process.env.DYNATRACE_ENV_URL?.replace(/\/$/, "");
  const problemUrl = envUrl
    ? `${envUrl}/ui/problems/${encodeURIComponent(problem.problemId)}`
    : `${getAppUrl()}/dashboard/problems`;
  const impacted = problem.impactedEntities?.map((entity) => entity.name).filter(Boolean) ?? [];
  const severity = problem.severityLevel || "UNKNOWN";
  const title = problem.title || problem.displayId || problem.problemId;

  return sendResendEmail({
    to: ["fabio.almeida@pinvestcapital.com"],
    subject: `[Dynatrace ${severity}] ${title}`,
    idempotencyKey: `dynatrace-problem-${problem.problemId}`,
    text: `Dynatrace problem alert

Title: ${title}
Display ID: ${problem.displayId}
Problem ID: ${problem.problemId}
Severity: ${severity}
Status: ${problem.status}
Started: ${formatProblemTime(problem.startTime)}
Impacted entities: ${impacted.length ? impacted.join(", ") : "None reported"}

Open in Dynatrace: ${problemUrl}
Open in FlowLog: ${getAppUrl()}/dashboard/problems
`,
    html: `
      <h2>Dynatrace problem alert</h2>
      <p><strong>Title:</strong> ${escapeHtml(title)}</p>
      <p><strong>Display ID:</strong> ${escapeHtml(problem.displayId || "-")}</p>
      <p><strong>Problem ID:</strong> ${escapeHtml(problem.problemId)}</p>
      <p><strong>Severity:</strong> ${escapeHtml(severity)}</p>
      <p><strong>Status:</strong> ${escapeHtml(problem.status || "-")}</p>
      <p><strong>Started:</strong> ${escapeHtml(formatProblemTime(problem.startTime))}</p>
      <p><strong>Impacted entities:</strong> ${escapeHtml(impacted.length ? impacted.join(", ") : "None reported")}</p>
      <p><a href="${problemUrl}">Open problem in Dynatrace</a></p>
      <p><a href="${getAppUrl()}/dashboard/problems">Open FlowLog problems dashboard</a></p>
    `,
  });
}
