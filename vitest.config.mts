import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

config({ path: [".env.test", ".env.local", ".env"], quiet: true });

// The suite never uses the development database (QA B26). It runs against "<dev name>_test" on the
// same local server, created and migrated by tests/global-setup.ts, unless TEST_DATABASE_URL says otherwise.
const devUrl = process.env.DATABASE_URL ?? "";
function deriveTestUrl(url: string): string {
  if (!url) return "";
  const u = new URL(url);
  const name = decodeURIComponent(u.pathname.slice(1)) || "postgres";
  u.pathname = `/${name.endsWith("_test") ? name : `${name === "postgres" ? "inmobiliaria" : name}_test`}`;
  return u.toString();
}
const explicitTestUrl = process.env.TEST_DATABASE_URL;
const testUrl = explicitTestUrl || deriveTestUrl(devUrl);
// The same value is used by the setup (main process) and by the test workers.
process.env.DATABASE_URL = testUrl;
process.env.DIRECT_URL = testUrl;
process.env.DEV_DATABASE_URL = devUrl;
if (explicitTestUrl) process.env.TEST_DATABASE_URL_EXPLICIT = "1";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/helpers/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    env: {
      // Tests must never send real email, whatever the developer has in .env.local.
      EMAIL_PROVIDER: "mock",
      DATABASE_URL: testUrl,
      DIRECT_URL: testUrl,
      DEV_DATABASE_URL: devUrl,
    },
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
