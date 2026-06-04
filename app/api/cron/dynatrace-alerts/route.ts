import { NextRequest, NextResponse } from "next/server";
import { getProblems } from "@/lib/dynatrace";
import { sendDynatraceProblemAlertEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getProblems();
  const problems = data.problems ?? [];
  const openProblems = problems.filter((problem) => problem.status !== "CLOSED");
  const sent: Array<{ problemId: string; result: unknown }> = [];
  const failed: Array<{ problemId: string; error: string }> = [];

  for (const problem of openProblems) {
    try {
      const result = await sendDynatraceProblemAlertEmail(problem);
      sent.push({ problemId: problem.problemId, result });
    } catch (error) {
      failed.push({
        problemId: problem.problemId,
        error: error instanceof Error ? error.message : "Failed to send alert email",
      });
    }
  }

  return NextResponse.json({
    ok: failed.length === 0,
    checkedAt: new Date().toISOString(),
    totalOpenProblems: openProblems.length,
    sentCount: sent.length,
    failedCount: failed.length,
    sent,
    failed,
  });
}
