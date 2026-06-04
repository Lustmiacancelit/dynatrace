import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendSupportTicketEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { subject, priority, message, createdAt } = await req.json();
    if (!subject || !message) {
      return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
    }

    const result = await sendSupportTicketEmail({
      subject,
      priority,
      message,
      createdAt,
      requesterEmail: session.email,
    });

    return NextResponse.json({
      ok: true,
      emailSent: !("skipped" in result),
      mailPreview: "skipped" in result ? result : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
