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

  // Get IDs of users we follow
  const following = await db.follow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);
  // Include own activity too
  followingIds.push(session.user.id);

  const [events, total] = await Promise.all([
    db.activityEvent.findMany({
      where: { userId: { in: followingIds } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, image: true, email: true },
        },
        analysis: {
          include: {
            repo: {
              select: { owner: true, name: true, fullName: true, language: true },
            },
          },
        },
      },
    }),
    db.activityEvent.count({ where: { userId: { in: followingIds } } }),
  ]);

  return NextResponse.json({
    events,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
