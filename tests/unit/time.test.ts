import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { timeAgo } from "@/lib/time";

describe("timeAgo", () => {
  const NOW = new Date("2025-06-01T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for dates less than 1 minute ago', () => {
    const date = new Date(NOW.getTime() - 30_000); // 30 seconds
    expect(timeAgo(date)).toBe("just now");
  });

  it("returns minutes for dates less than 1 hour ago", () => {
    const date = new Date(NOW.getTime() - 5 * 60_000); // 5 minutes
    expect(timeAgo(date)).toBe("5m ago");
  });

  it("returns hours for dates less than 24 hours ago", () => {
    const date = new Date(NOW.getTime() - 3 * 3600_000); // 3 hours
    expect(timeAgo(date)).toBe("3h ago");
  });

  it("returns days for dates less than 30 days ago", () => {
    const date = new Date(NOW.getTime() - 7 * 86400_000); // 7 days
    expect(timeAgo(date)).toBe("7d ago");
  });

  it("returns a localeDateString for dates 30+ days ago", () => {
    const date = new Date(NOW.getTime() - 40 * 86400_000); // 40 days
    const result = timeAgo(date);
    // Should be a formatted date string, not a relative label
    expect(result).not.toContain("ago");
    expect(result.length).toBeGreaterThan(0);
  });

  it("accepts a string date", () => {
    const date = new Date(NOW.getTime() - 10 * 60_000).toISOString();
    expect(timeAgo(date)).toBe("10m ago");
  });
});
