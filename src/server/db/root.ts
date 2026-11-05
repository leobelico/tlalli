import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * ROOT Prisma client — connects as the table owner and therefore BYPASSES Row Level Security.
 *
 * Only import this from the audited modules allowed in eslint.config.mjs
 * (session lookup, invitations, public webhook routing, seed, tests).
 * Everything else must use `withOrg()` from ./tenant.
 */
function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const globalForPrisma = globalThis as unknown as { __rootPrisma?: PrismaClient };

export const rootPrisma: PrismaClient = globalForPrisma.__rootPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.__rootPrisma = rootPrisma;
