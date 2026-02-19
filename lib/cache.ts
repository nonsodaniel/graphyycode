"use client";

/**
 * IndexedDB cache using localforage for offline analysis access.
 * Key-value store for analysis artifacts, screenshots, and dashboard history.
 */

let forage: typeof import("localforage") | null = null;

async function getForage() {
  if (!forage) {
    const lf = (await import("localforage")).default;
    lf.config({
      name: "graphyycode",
      storeName: "cache",
      version: 1,
    });
    forage = lf;
  }
  return forage;
}

export async function cacheSet<T>(key: string, value: T): Promise<void> {
  try {
    const lf = await getForage();
    await lf.setItem(key, value);
  } catch {
    // silently fail — cache is best-effort
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const lf = await getForage();
    return await lf.getItem<T>(key);
  } catch {
    return null;
  }
}

export async function cacheRemove(key: string): Promise<void> {
  try {
    const lf = await getForage();
    await lf.removeItem(key);
  } catch {
    // ignore
  }
}

// Convenience helpers for specific data types
export const analysisCache = {
  set: (id: string, data: unknown) => cacheSet(`analysis:${id}`, data),
  get: (id: string) => cacheGet(`analysis:${id}`),
};

export const dashboardCache = {
  set: (data: unknown) => cacheSet("dashboard:history", data),
  get: () => cacheGet("dashboard:history"),
};
