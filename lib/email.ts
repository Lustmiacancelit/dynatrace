import { ADMIN_EMAILS } from "./auth";

const FROM_EMAIL = "FlowLog Dynatrace <support@flowlog.dev>";

async function sendResendEmail(payload: {
  to: string[];
  subject: string;
  html: string;
  text: string;
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
    },
    body: JSON.stringify({ from: FROM_EMAIL, ...payload }),
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
