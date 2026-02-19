import { db } from "@/lib/db";

export const GUEST_LIMIT = 3;

export type GuestCheckResult =
  | { allowed: true; count: number }
  | { allowed: false; code: "GUEST_LIMIT_REACHED"; count: number };

/**
 * Checks and increments guest usage.
 * Returns allowed=false when the limit has been exceeded.
 */
export async function checkAndIncrementGuestUsage(
  deviceId: string,
  ipAddress?: string
): Promise<GuestCheckResult> {
  const existing = await db.guestUsage.findUnique({
    where: { deviceId },
  });

  if (!existing) {
    // First use — create record
    await db.guestUsage.create({
      data: { deviceId, ipAddress, count: 1 },
    });
    return { allowed: true, count: 1 };
  }

  if (existing.count >= GUEST_LIMIT) {
    return {
      allowed: false,
      code: "GUEST_LIMIT_REACHED",
      count: existing.count,
    };
  }

  // Increment
  const updated = await db.guestUsage.update({
    where: { deviceId },
    data: {
      count: { increment: 1 },
      lastUsedAt: new Date(),
      ipAddress: ipAddress ?? existing.ipAddress,
    },
  });

  return { allowed: true, count: updated.count };
}

/**
 * Returns the current guest usage count without modifying it.
 */
export async function getGuestUsageCount(deviceId: string): Promise<number> {
  const record = await db.guestUsage.findUnique({ where: { deviceId } });
  return record?.count ?? 0;
}
