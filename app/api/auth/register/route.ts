import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth";
import { notifyAdminsOfRegistration } from "@/lib/email";
import { upsertAccessRequest } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const company = String(body.company || "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Enter your name." }, { status: 400 });
    }

    await upsertAccessRequest({ email, name, company, isAdmin: isAdminEmail(email) });

    if (!isAdminEmail(email)) {
      await notifyAdminsOfRegistration({ email, name, company });
    }

    return NextResponse.json({
      message: isAdminEmail(email)
        ? "Admin email recognized. Use the login tab with the admin password."
        : "Access request sent. You will receive a login email after approval.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed." },
      { status: 500 }
    );
  }
}
