import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { rootPrisma } from "./root";

export type Tx = Prisma.TransactionClient;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Runs `fn` inside a transaction scoped to one organization.
 *
 * The transaction switches to the `app_rls` role (subject to RLS) and sets `app.org_id`,
 * so Postgres itself filters every read and rejects every write outside the organization,
 * even if application code forgets a `where: { organizationId }`.
 */
export async function withOrg<T>(orgId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  if (!UUID_RE.test(orgId)) throw new Error("withOrg: invalid organization id");
  return rootPrisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL ROLE app_rls");
      await tx.$queryRaw`SELECT set_config('app.org_id', ${orgId}, true)`;
      return fn(tx);
    },
    { timeout: 20_000, maxWait: 10_000 },
  );
}
