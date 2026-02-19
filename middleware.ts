import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// /dashboard is intentionally NOT protected — guests see local history there
const PROTECTED_ROUTES = ["/feed", "/admin"];

/**
 * Edge-compatible middleware: checks for a NextAuth session cookie without
 * importing the Prisma adapter (which requires Node.js runtime).
 * Actual session validation and role checks happen inside each route/page.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  if (!isProtected) return NextResponse.next();

  // NextAuth v5 session cookie names (HTTP dev / HTTPS prod)
  const hasSession =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/feed/:path*", "/admin/:path*"],
};
