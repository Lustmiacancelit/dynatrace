import { NextResponse } from "next/server";
import { consumeLoginToken } from "@/lib/supabase";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const token = String(body.token || "");

    if (!email || !token) {
      return NextResponse.json({ error: "Login link is missing required information." }, { status: 400 });
    }

    const request = await consumeLoginToken(email, token);
    if (!request) {
      return NextResponse.json({ error: "Login link is invalid or expired." }, { status: 401 });
    }

    setSessionCookie({ email: request.email, role: request.is_admin ? "admin" : "user" });
    return NextResponse.json({ redirectTo: "/dashboard" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed." },
      { status: 500 }
    );
  }
}
