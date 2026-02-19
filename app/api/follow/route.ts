import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId: targetId } = await req.json();
  if (!targetId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  if (targetId === session.user.id) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const existing = await db.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: session.user.id,
        followingId: targetId,
      },
    },
  });

  if (existing) {
    return NextResponse.json({ message: "Already following" });
  }

  await db.follow.create({
    data: {
      followerId: session.user.id,
      followingId: targetId,
    },
  });

  return NextResponse.json({ success: true });
}
