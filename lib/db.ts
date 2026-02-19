import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = {
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  };
  if (process.env.DATABASE_URL) {
    options.datasourceUrl = process.env.DATABASE_URL;
  }
  return new PrismaClient(options);
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
