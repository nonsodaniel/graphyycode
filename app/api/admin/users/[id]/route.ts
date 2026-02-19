import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const body = await req.json();
  const { role } = body as { role?: "USER" | "ADMIN" };

  if (!role || !["USER", "ADMIN"].includes(role)) {
    return NextResponse.json(
      { error: "Invalid role. Must be USER or ADMIN" },
      { status: 400 }
    );
  }

  const updated = await db.user.update({
    where: { id },
    data: { role },
    select: { id: true, email: true, name: true, role: true },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      actorId: session!.user.id,
      targetId: id,
      action: "UPDATE_ROLE",
      resource: "User",
      resourceId: id,
      metadata: { newRole: role },
    },
  });

  return NextResponse.json({ user: updated });
}
