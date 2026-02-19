import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    const analysis = await db.analysis.findUnique({
      where: { id },
      include: {
        repo: true,
        artifact: true,
      },
    });

    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    // Allow access if: owned by user, or guest (guestId in query), or completed public
    const guestId = req.nextUrl.searchParams.get("guestId");
    const isOwner = session?.user?.id && analysis.userId === session.user.id;
    const isGuest = guestId && analysis.guestId === guestId;
    const isPublic = analysis.status === "COMPLETED";

    if (!isOwner && !isGuest && !isPublic) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      id: analysis.id,
      status: analysis.status,
      error: analysis.error,
      repo: analysis.repo,
      artifact: analysis.artifact
        ? {
            nodes: analysis.artifact.nodes,
            edges: analysis.artifact.edges,
            fileTree: analysis.artifact.fileTree,
            callGraph: analysis.artifact.callGraph,
            fileRoles: analysis.artifact.fileRoles,
          }
        : null,
      createdAt: analysis.createdAt,
    });
  } catch (err) {
    console.error("[/api/analysis/:id] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
