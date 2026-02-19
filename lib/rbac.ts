import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Check if the current session user is an admin.
 * Returns the session if admin, or a 401/403 JSON response if not.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (session.user.role !== "ADMIN") {
    return {
      session: null,
      response: NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 }),
    };
  }
  return { session, response: null };
}
