import { afterAll, describe, expect, it } from "vitest";
import pg from "pg";
import { rootPrisma } from "@/server/db/root";
import { cleanup, makeOrg } from "./helpers/factory";

/** B26: the suite must never touch the development database. */
describe("tests run against their own database", () => {
  afterAll(cleanup);
  const dbName = (url: string) => decodeURIComponent(new URL(url).pathname.slice(1));

  it("the connection points to a database named *_test", async () => {
    expect(dbName(process.env.DATABASE_URL!)).toMatch(/_test$/);
    const [{ db }] = await rootPrisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
    expect(db).toMatch(/_test$/);
    expect(db).not.toBe(dbName(process.env.DEV_DATABASE_URL!));
  });

  it("what the tests create never shows up in the development database", async () => {
    const { org } = await makeOrg("Solo en pruebas");
    const dev = new pg.Client({ connectionString: process.env.DEV_DATABASE_URL });
    await dev.connect();
    try {
      const r = await dev.query("SELECT count(*)::int AS n FROM organizations WHERE id = $1", [org.id]);
      expect(r.rows[0].n).toBe(0);
    } finally {
      await dev.end();
    }
  });
});
