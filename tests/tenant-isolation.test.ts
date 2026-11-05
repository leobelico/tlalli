import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rootPrisma } from "@/server/db/root";
import { withOrg } from "@/server/db/tenant";
import { cleanup, makeOrg } from "./helpers/factory";

describe("multi-tenant isolation (Postgres RLS)", () => {
  let a: Awaited<ReturnType<typeof makeOrg>>;
  let b: Awaited<ReturnType<typeof makeOrg>>;
  let leadB: { id: string };
  let devB: { id: string };

  beforeAll(async () => {
    a = await makeOrg("Org A");
    b = await makeOrg("Org B");
    await rootPrisma.lead.create({
      data: {
        organizationId: a.org.id,
        firstName: "Lead A",
        phone: "+524440000001",
        channel: "RADIO",
        source: "MANUAL",
      },
    });
    leadB = await rootPrisma.lead.create({
      data: {
        organizationId: b.org.id,
        firstName: "Lead B",
        phone: "+524440000002",
        channel: "FACEBOOK",
        source: "MANUAL",
      },
    });
    devB = await rootPrisma.development.create({
      data: { organizationId: b.org.id, name: "Desarrollo B" },
    });
  });

  afterAll(cleanup);

  it("only returns rows from the active organization, even without a where filter", async () => {
    const leads = await withOrg(a.org.id, (tx) => tx.lead.findMany());
    expect(leads.map((l) => l.firstName)).toEqual(["Lead A"]);
    const orgs = await withOrg(a.org.id, (tx) => tx.organization.findMany());
    expect(orgs.map((o) => o.id)).toEqual([a.org.id]);
  });

  it("cannot read another org's lead by id", async () => {
    const found = await withOrg(a.org.id, (tx) => tx.lead.findUnique({ where: { id: leadB.id } }));
    expect(found).toBeNull();
  });

  it("cannot update or delete another org's rows", async () => {
    const updated = await withOrg(a.org.id, (tx) =>
      tx.lead.updateMany({ where: { id: leadB.id }, data: { firstName: "Hackeado" } }),
    );
    expect(updated.count).toBe(0);
    const deleted = await withOrg(a.org.id, (tx) => tx.development.deleteMany({ where: { id: devB.id } }));
    expect(deleted.count).toBe(0);
    const still = await rootPrisma.lead.findUniqueOrThrow({ where: { id: leadB.id } });
    expect(still.firstName).toBe("Lead B");
  });

  it("rejects inserting rows into another organization", async () => {
    await expect(
      withOrg(a.org.id, (tx) =>
        tx.lead.create({
          data: {
            organizationId: b.org.id,
            firstName: "Intruso",
            phone: "+524440000003",
            channel: "OTRO",
            source: "MANUAL",
          },
        }),
      ),
    ).rejects.toThrow(/row-level security|violates/i);
  });

  it("rejects moving a row to another organization", async () => {
    const leadA = await withOrg(a.org.id, (tx) => tx.lead.findFirstOrThrow());
    await expect(
      withOrg(a.org.id, (tx) =>
        tx.lead.update({ where: { id: leadA.id }, data: { organizationId: b.org.id } }),
      ),
    ).rejects.toThrow(/row-level security|violates/i);
  });

  it("returns nothing when no organization is set (fail closed)", async () => {
    const rows = await rootPrisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL ROLE app_rls");
      return tx.lead.findMany();
    });
    expect(rows).toEqual([]);
  });

  it("rejects malformed org ids", async () => {
    await expect(withOrg("' OR 1=1 --", (tx) => tx.lead.findMany())).rejects.toThrow(/invalid/);
  });

  it("every table with organization_id has RLS enabled and a policy", async () => {
    const rows = await rootPrisma.$queryRaw<{ table_name: string; rls: boolean; policies: bigint }[]>`
      SELECT c.table_name,
             cl.relrowsecurity AS rls,
             (SELECT count(*) FROM pg_policies p WHERE p.tablename = c.table_name AND p.schemaname = 'public') AS policies
      FROM information_schema.columns c
      JOIN pg_class cl ON cl.relname = c.table_name AND cl.relnamespace = 'public'::regnamespace
      WHERE c.table_schema = 'public' AND c.column_name = 'organization_id'`;
    expect(rows.length).toBeGreaterThan(10);
    for (const r of rows) {
      expect({ table: r.table_name, rls: r.rls, hasPolicy: r.policies > 0n }).toEqual({
        table: r.table_name,
        rls: true,
        hasPolicy: true,
      });
    }
  });

  it("anon/authenticated roles (Supabase REST API) cannot read tenant tables", async () => {
    await expect(
      rootPrisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL ROLE anon");
        return tx.$queryRawUnsafe("SELECT * FROM leads LIMIT 1");
      }),
    ).rejects.toThrow(/permission denied/i);
  });
});
