import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAndIncrementGuestUsage, GUEST_LIMIT } from "@/lib/guest";
import { parseGitHubUrl, fetchRepoInfo } from "@/lib/github";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();

    const { repoUrl, guestDeviceId } = body as {
      repoUrl?: string;
      guestDeviceId?: string;
    };

    if (!repoUrl) {
      return NextResponse.json(
        { error: "repoUrl is required" },
        { status: 400 }
      );
    }

    // Parse GitHub URL
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid GitHub repository URL" },
        { status: 400 }
      );
    }

    // Guest limit check (only for unauthenticated users)
    let guestId: string | undefined;
    if (!session?.user) {
      if (!guestDeviceId) {
        return NextResponse.json(
          { error: "guestDeviceId required for guest access" },
          { status: 400 }
        );
      }

      const ipAddress =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        undefined;

      const result = await checkAndIncrementGuestUsage(guestDeviceId, ipAddress);

      if (!result.allowed) {
        return NextResponse.json(
          {
            error: "Guest analysis limit reached",
            code: "GUEST_LIMIT_REACHED",
            limit: GUEST_LIMIT,
            count: result.count,
          },
          { status: 429 }
        );
      }

      guestId = guestDeviceId;
    }

    // Fetch repo metadata from GitHub
    let repoInfo;
    try {
      repoInfo = await fetchRepoInfo(parsed.owner, parsed.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch repository";
      return NextResponse.json({ error: message }, { status: 422 });
    }

    // Upsert repo
    const repo = await db.repo.upsert({
      where: { fullName: repoInfo.fullName },
      create: {
        owner: repoInfo.owner,
        name: repoInfo.name,
        fullName: repoInfo.fullName,
        description: repoInfo.description,
        language: repoInfo.language,
        stars: repoInfo.stars,
        forks: repoInfo.forks,
      },
      update: {
        description: repoInfo.description,
        language: repoInfo.language,
        stars: repoInfo.stars,
        forks: repoInfo.forks,
      },
    });

    // Create analysis record
    const analysis = await db.analysis.create({
      data: {
        repoId: repo.id,
        userId: session?.user?.id ?? null,
        guestId: guestId ?? null,
        status: "PENDING",
      },
    });

    // Log activity if user is authenticated
    if (session?.user?.id) {
      await db.activityEvent.create({
        data: {
          userId: session.user.id,
          analysisId: analysis.id,
          type: "ANALYSED",
          metadata: { repoFullName: repoInfo.fullName },
        },
      });
    }

    return NextResponse.json({
      analysisId: analysis.id,
      status: "PENDING",
      repo: {
        owner: repo.owner,
        name: repo.name,
        fullName: repo.fullName,
        description: repo.description,
        language: repo.language,
        stars: repo.stars,
        forks: repo.forks,
      },
    });
  } catch (err) {
    console.error("[/api/analyse] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
