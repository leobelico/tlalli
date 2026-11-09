import { execSync } from "node:child_process";
import pg from "pg";

/**
 * Prepares the disposable test database (QA B26): creates it if missing, applies every migration and
 * empties it, so each run starts clean and never touches the development database.
 *
 * Safety: it refuses to run unless the database is literally named *_test and, when it is not an
 * explicit TEST_DATABASE_URL, lives on this machine. It deletes data, so it must never hit a real one.
 */
export default async function setup() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está definida para las pruebas.");
  const u = new URL(url);
  const dbName = decodeURIComponent(u.pathname.slice(1));
  if (!/_test$/.test(dbName)) {
    throw new Error(`Las pruebas se niegan a correr contra "${dbName}": la base de pruebas debe llamarse *_test.`);
  }
  const explicit = Boolean(process.env.TEST_DATABASE_URL_EXPLICIT);
  if (!explicit && !["127.0.0.1", "localhost", "::1"].includes(u.hostname)) {
    throw new Error(`Las pruebas solo corren solas contra una base local (host "${u.hostname}"). Define TEST_DATABASE_URL a propósito si es otra.`);
  }

  // 1) create the database if needed (connect to the server's maintenance database)
  const admin = new URL(url);
  admin.pathname = "/postgres";
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (!exists.rowCount) await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
  } finally {
    await client.end();
  }

  // 2) migrations (DIRECT_URL wins in prisma.config.ts)
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  });

  // 3) empty it: tests create everything they need
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  try {
    const tables = await db.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
    );
    if (tables.rowCount) {
      await db.query(`TRUNCATE ${tables.rows.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
    }
  } finally {
    await db.end();
  }
}
