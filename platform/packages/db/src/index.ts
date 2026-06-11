import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export * from "@prisma/client";

let _prisma: PrismaClient | null = null;

/**
 * Lazily construct the shared Prisma client (Prisma 7 driver adapter). Only
 * called when DATABASE_URL is configured — demo/test runs use the in-memory
 * store instead, so this is never instantiated without a real database.
 */
export function getPrisma(
  connectionString: string | undefined = process.env.DATABASE_URL,
): PrismaClient {
  if (!_prisma) {
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set — cannot construct the Prisma client.",
      );
    }
    const adapter = new PrismaPg({ connectionString });
    _prisma = new PrismaClient({ adapter });
  }
  return _prisma;
}
