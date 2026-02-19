import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        actor: { select: { id: true, name: true, email: true } },
        target: { select: { id: true, name: true, email: true } },
      },
    }),
    db.auditLog.count(),
  ]);

  return NextResponse.json({
    logs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
