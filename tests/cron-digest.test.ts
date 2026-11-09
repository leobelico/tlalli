import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/cron/daily-digest/route";

const call = (auth?: string) =>
  GET(new Request("http://localhost/api/cron/daily-digest", { headers: auth ? { authorization: auth } : {} }) as never);

describe("/api/cron/daily-digest", () => {
  const prev = process.env.CRON_SECRET;
  beforeEach(() => {
    process.env.CRON_SECRET = "secreto-de-prueba-123456";
  });
  afterEach(() => {
    if (prev === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prev;
  });

  it("rejects calls without the secret or with a wrong one", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer otro")).status).toBe(401);
    expect((await call("secreto-de-prueba-123456")).status).toBe(401);
  });

  it("is closed when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    expect((await call("Bearer ")).status).toBe(401);
    expect((await call("Bearer undefined")).status).toBe(401);
  });

  it("runs with the right secret", async () => {
    const res = await call("Bearer secreto-de-prueba-123456");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });
});
