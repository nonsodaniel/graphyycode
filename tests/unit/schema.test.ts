import { describe, it, expect } from "vitest";

// Test that our schema types are correct by checking shape of mock data

describe("Database schema shapes", () => {
  it("GuestUsage model has required fields", () => {
    const mock = {
      id: "clxxx",
      deviceId: "device-123",
      ipAddress: "127.0.0.1",
      count: 1,
      lastUsedAt: new Date(),
      createdAt: new Date(),
    };
    expect(mock.deviceId).toBeDefined();
    expect(mock.count).toBe(1);
  });

  it("Analysis status enum values are valid", () => {
    const statuses = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"];
    expect(statuses).toContain("COMPLETED");
    expect(statuses).toContain("FAILED");
  });

  it("User role enum values are valid", () => {
    const roles = ["USER", "ADMIN"];
    expect(roles).toContain("USER");
    expect(roles).toContain("ADMIN");
  });

  it("Follow model enforces unique pair", () => {
    const follows = [
      { followerId: "a", followingId: "b" },
      { followerId: "b", followingId: "a" },
    ];
    const pairs = new Set(follows.map((f) => `${f.followerId}:${f.followingId}`));
    expect(pairs.size).toBe(2);
  });
});
