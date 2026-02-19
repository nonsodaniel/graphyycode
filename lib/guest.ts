import { db } from "@/lib/db";

export const GUEST_LIMIT = Infinity; // TODO: re-enable limit when ready

export type GuestCheckResult =
  | { allowed: true; count: number }
  | { allowed: false; code: "GUEST_LIMIT_REACHED"; count: number };

/**
 * Tracks guest usage and always allows access (limit disabled).
 */
export async function checkAndIncrementGuestUsage(
  deviceId: string,
  ipAddress?: string
): Promise<GuestCheckResult> {
  const record = await db.guestUsage.upsert({
    where: { deviceId },
    create: { deviceId, ipAddress, count: 1 },
    update: {
      count: { increment: 1 },
      lastUsedAt: new Date(),
      ipAddress: ipAddress ?? undefined,
    },
  });

  return { allowed: true, count: record.count };
}

/**
 * Returns the current guest usage count without modifying it.
 */
export async function getGuestUsageCount(deviceId: string): Promise<number> {
  const record = await db.guestUsage.findUnique({ where: { deviceId } });
  return record?.count ?? 0;
}
