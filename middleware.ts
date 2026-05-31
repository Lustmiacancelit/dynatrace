import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Fast-path redirect: cookie existence check only.
// Full HMAC validation happens in requireSession() inside Server Components.
export function middleware(req: NextRequest) {
  const hasSession = !!req.cookies.get("dql_session")?.value;
  if (!hasSession && req.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*"] };
