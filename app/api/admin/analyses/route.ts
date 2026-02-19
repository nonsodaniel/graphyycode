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

  const [analyses, total, stats] = await Promise.all([
    db.analysis.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        repo: { select: { owner: true, name: true, fullName: true, language: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    db.analysis.count(),
    db.analysis.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json({
    analyses,
    stats: Object.fromEntries(stats.map((s) => [s.status, s._count._all])),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
