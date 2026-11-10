import { afterEach, describe, expect, it, vi } from "vitest";

/** Vercel build error: importing a route threw "DATABASE_URL is not set" on a machine that only builds. */
describe("root Prisma client is created on first use", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    delete (globalThis as { __rootPrisma?: unknown }).__rootPrisma;
  });

  it("importing it without DATABASE_URL does not throw; using it does, with a clear message", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.resetModules();
    delete (globalThis as { __rootPrisma?: unknown }).__rootPrisma;
    const mod = await import("@/server/db/root");
    expect(mod.rootPrisma).toBeTruthy();
    expect(() => mod.rootPrisma.user).toThrow(/DATABASE_URL is not set/);
  });

  it("with DATABASE_URL it works as the same client (methods keep their `this`)", async () => {
    vi.resetModules();
    const { rootPrisma } = await import("@/server/db/root");
    expect(Number(await rootPrisma.organization.count())).toBeGreaterThanOrEqual(0);
    expect(typeof rootPrisma.$transaction).toBe("function");
  });
});
