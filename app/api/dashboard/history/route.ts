import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const skip = (page - 1) * limit;

  const [analyses, total] = await Promise.all([
    db.analysis.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        repo: {
          select: {
            owner: true,
            name: true,
            fullName: true,
            language: true,
            description: true,
          },
        },
        screenshots: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, imageUrl: true, shareToken: true, createdAt: true },
        },
      },
    }),
    db.analysis.count({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({
    analyses,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
