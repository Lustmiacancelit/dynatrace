import { NextResponse } from "next/server";
import { findAccessRequestByEmail } from "@/lib/supabase";
import { getAdminPassword, isAdminEmail, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (isAdminEmail(email)) {
      if (password !== getAdminPassword()) {
        return NextResponse.json({ error: "Admin password is incorrect." }, { status: 401 });
      }
      setSessionCookie({ email, role: "admin" });
      return NextResponse.json({ redirectTo: "/dashboard" });
    }

    const request = await findAccessRequestByEmail(email);
    if (!request) {
      return NextResponse.json({ error: "No access request found for this email." }, { status: 404 });
    }
    if (request.status !== "approved") {
      return NextResponse.json({ error: "Your access request is still pending approval." }, { status: 403 });
    }

    return NextResponse.json({
      message: "Use the secure login link that was emailed to you after approval.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed." },
      { status: 500 }
    );
  }
}
