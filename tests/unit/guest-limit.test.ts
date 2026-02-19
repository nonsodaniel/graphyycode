import { describe, it, expect, vi } from "vitest";

// Mock the db module to avoid PrismaClient instantiation in unit tests
vi.mock("@/lib/db", () => ({
  db: {
    guestUsage: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { GUEST_LIMIT, checkAndIncrementGuestUsage } from "@/lib/guest";
import { parseGitHubUrl } from "@/lib/github";
import { db } from "@/lib/db";

describe("GUEST_LIMIT constant", () => {
  it("is set to 5", () => {
    expect(GUEST_LIMIT).toBe(5);
  });
});

describe("parseGitHubUrl", () => {
  it("parses a valid GitHub URL", () => {
    const result = parseGitHubUrl("https://github.com/vercel/next.js");
    expect(result).toEqual({ owner: "vercel", name: "next.js" });
  });

  it("strips .git suffix", () => {
    const result = parseGitHubUrl("https://github.com/facebook/react.git");
    expect(result).toEqual({ owner: "facebook", name: "react" });
  });

  it("returns null for non-GitHub URLs", () => {
    expect(parseGitHubUrl("https://gitlab.com/owner/repo")).toBeNull();
  });

  it("returns null for incomplete URLs (owner only)", () => {
    expect(parseGitHubUrl("https://github.com/owner")).toBeNull();
  });

  it("returns null for invalid URLs", () => {
    expect(parseGitHubUrl("not-a-url")).toBeNull();
  });
});

describe("checkAndIncrementGuestUsage", () => {
  const mockDb = vi.mocked(db);

  it("creates new record on first use and returns allowed=true", async () => {
    vi.mocked(mockDb.guestUsage.findUnique).mockResolvedValue(null);
    vi.mocked(mockDb.guestUsage.create).mockResolvedValue({
      id: "1",
      deviceId: "device-1",
      ipAddress: null,
      count: 1,
      lastUsedAt: new Date(),
      createdAt: new Date(),
    });

    const result = await checkAndIncrementGuestUsage("device-1");
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(1);
    expect(mockDb.guestUsage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deviceId: "device-1", count: 1 }) })
    );
  });

  it("returns allowed=false when count >= GUEST_LIMIT", async () => {
    vi.mocked(mockDb.guestUsage.findUnique).mockResolvedValue({
      id: "1",
      deviceId: "device-2",
      ipAddress: null,
      count: GUEST_LIMIT,
      lastUsedAt: new Date(),
      createdAt: new Date(),
    });

    const result = await checkAndIncrementGuestUsage("device-2");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("GUEST_LIMIT_REACHED");
    }
  });

  it("increments count when below limit", async () => {
    vi.mocked(mockDb.guestUsage.findUnique).mockResolvedValue({
      id: "1",
      deviceId: "device-3",
      ipAddress: null,
      count: 2,
      lastUsedAt: new Date(),
      createdAt: new Date(),
    });
    vi.mocked(mockDb.guestUsage.update).mockResolvedValue({
      id: "1",
      deviceId: "device-3",
      ipAddress: null,
      count: 3,
      lastUsedAt: new Date(),
      createdAt: new Date(),
    });

    const result = await checkAndIncrementGuestUsage("device-3");
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(3);
  });
});
