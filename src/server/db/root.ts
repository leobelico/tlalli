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

/**
 * Created on first use, not when the module is imported: `next build` imports every route to collect its
 * configuration, and a build machine does not (and should not need to) have the database URL. A missing
 * DATABASE_URL still fails loudly, at the first query.
 */
function client(): PrismaClient {
  return (globalForPrisma.__rootPrisma ??= createClient());
}

export const rootPrisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const c = client();
    const value = Reflect.get(c, prop, c);
    return typeof value === "function" ? value.bind(c) : value;
  },
  has: (_target, prop) => prop in client(),
});
