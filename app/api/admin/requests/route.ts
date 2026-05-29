import { NextResponse } from "next/server";
import { createToken, getSession } from "@/lib/auth";
import { approveAccessRequest, listAccessRequests } from "@/lib/supabase";
import { sendApprovedLoginEmail } from "@/lib/email";

function requireApiAdmin() {
  const session = getSession();
  if (!session || session.role !== "admin") {
    return null;
  }
  return session;
}

export async function GET() {
  try {
    const session = requireApiAdmin();
    if (!session) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
    const requests = await listAccessRequests();
    return NextResponse.json({ requests });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load requests." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = requireApiAdmin();
    if (!session) return NextResponse.json({ error: "Admin access required." }, { status: 401 });

    const body = await req.json();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "Missing request id." }, { status: 400 });

    const token = createToken();
    const request = await approveAccessRequest(id, session.email, token);
    await sendApprovedLoginEmail({ email: request.email, token });

    return NextResponse.json({ message: `Approved ${request.email} and sent the login email.` });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Approval failed." },
      { status: 500 }
    );
  }
}
