import { redirect } from "next/navigation";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  clearSessionCookie();
  redirect("/");
}
