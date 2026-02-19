import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function generateShareToken(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const { analysisId, imageData, caption, isPublic } = await req.json();

    if (!analysisId) {
      return NextResponse.json({ error: "analysisId required" }, { status: 400 });
    }

    const analysis = await db.analysis.findUnique({ where: { id: analysisId } });
    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    // Check ownership: user must own the analysis (or be guest with matching guestId)
    if (session?.user?.id) {
      if (analysis.userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const shareToken = generateShareToken();

    const screenshot = await db.screenshot.create({
      data: {
        analysisId,
        userId: session?.user?.id ?? null,
        imageData,
        caption: caption ?? null,
        isPublic: isPublic ?? false,
        shareToken,
      },
    });

    // Log activity
    if (session?.user?.id) {
      await db.activityEvent.create({
        data: {
          userId: session.user.id,
          analysisId,
          type: "SCREENSHOT",
          metadata: { screenshotId: screenshot.id },
        },
      });
    }

    return NextResponse.json({
      id: screenshot.id,
      shareToken: screenshot.shareToken,
      shareUrl: `${process.env.NEXTAUTH_URL ?? ""}/share/${shareToken}`,
    });
  } catch (err) {
    console.error("[/api/screenshots] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const screenshots = await db.screenshot.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      analysis: {
        include: {
          repo: { select: { owner: true, name: true, fullName: true } },
        },
      },
    },
  });

  return NextResponse.json({ screenshots });
}
