import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/public/leads/route";
import { rootPrisma } from "@/server/db/root";
import { clientIp } from "@/lib/client-ip";
import { hitRateLimit, resetSharedRateLimits } from "@/server/public/rate-limit";
import { issueFormToken, verifyFormToken } from "@/server/public/form-token";
import { cleanup, makeOrg } from "./helpers/factory";

function post(body: Record<string, unknown>, headers: Record<string, string> = {}, form = false) {
  return new NextRequest("http://localhost/api/public/leads", {
    method: "POST",
    headers: { "content-type": form ? "application/x-www-form-urlencoded" : "application/json", ...headers },
    body: form ? new URLSearchParams(body as Record<string, string>).toString() : JSON.stringify(body),
  });
}

describe("B15: the public endpoint does not reveal whether a phone is already a lead", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  beforeAll(async () => {
    org = await makeOrg("B15 Org");
  });
  beforeEach(() => resetSharedRateLimits());
  afterAll(cleanup);

  it("answers identically for a new and an existing phone, without internal ids", async () => {
    const body = { nombre: "Nueva", telefono: "4449400001", acepta_privacidad: true };
    const first = await POST(post(body, { "x-form-key": org.org.leadFormKey }));
    const again = await POST(post({ ...body, mensaje: "otra vez" }, { "x-form-key": org.org.leadFormKey }));
    expect(first.status).toBe(again.status);
    const [a, b] = [await first.json(), await again.json()];
    expect(a).toEqual(b);
    expect(a).toEqual({ ok: true });
    // ...but the repeat contact is still tracked internally.
    const lead = await rootPrisma.lead.findFirstOrThrow({
      where: { organizationId: org.org.id, phone: "+524449400001" },
      include: { activities: true },
    });
    expect(lead.activities.some((x) => x.body.includes("otra vez"))).toBe(true);
  });
});

describe("B16: shared rate limiting that cannot be dodged with X-Forwarded-For", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  const prevProxy = process.env.TRUSTED_PROXY;
  beforeAll(async () => {
    org = await makeOrg("B16 Org");
  });
  beforeEach(async () => {
    await resetSharedRateLimits();
    delete process.env.TRUSTED_PROXY;
  });
  afterAll(async () => {
    if (prevProxy === undefined) delete process.env.TRUSTED_PROXY;
    else process.env.TRUSTED_PROXY = prevProxy;
    await cleanup();
  });

  it("clientIp ignores forwarded headers unless a proxy is explicitly trusted", () => {
    const h = new Headers({ "x-forwarded-for": "6.6.6.6, 10.0.0.1", "x-real-ip": "7.7.7.7", "x-vercel-forwarded-for": "8.8.8.8" });
    expect(clientIp(h, "none")).toBeNull();
    expect(clientIp(h, undefined)).toBeNull();
    expect(clientIp(h, "vercel")).toBe("8.8.8.8");
    expect(clientIp(h, "xff:1")).toBe("10.0.0.1"); // the hop our single trusted proxy saw
    expect(clientIp(h, "xff:2")).toBe("6.6.6.6");
    expect(clientIp(new Headers({ "x-forwarded-for": "not-an-ip" }), "xff:1")).toBeNull();
  });

  it("counts in the shared store, atomically, and resets after the window", async () => {
    const t0 = new Date("2026-11-10T10:00:00Z");
    const results = await Promise.all(Array.from({ length: 5 }, () => hitRateLimit("t:k", 3, 60_000, t0)));
    expect(results.filter((r) => r.ok)).toHaveLength(3);
    expect((await hitRateLimit("t:k", 3, 60_000, new Date(t0.getTime() + 61_000))).ok).toBe(true);
  });

  it("spoofing X-Forwarded-For does not let one phone flood a lead's history", async () => {
    for (let i = 0; i < 12; i++) {
      const res = await POST(
        post(
          { nombre: "Spam", telefono: "4449400100", acepta_privacidad: true, mensaje: `spam ${i}` },
          { "x-form-key": org.org.leadFormKey, "x-forwarded-for": `10.9.0.${i}` },
        ),
      );
      expect(res.status).toBe(200); // neutral: an attacker can't tell when it starts being dropped
    }
    const lead = await rootPrisma.lead.findFirstOrThrow({
      where: { organizationId: org.org.id, phone: "+524449400100" },
      include: { activities: true },
    });
    expect(lead.activities.length).toBeLessThanOrEqual(5);
  });
});

describe("invisible anti-bot check on the hosted form", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  beforeAll(async () => {
    org = await makeOrg("Bot Org");
  });
  beforeEach(() => resetSharedRateLimits());
  afterAll(cleanup);

  it("form tokens are signed and need a minimum fill time", () => {
    const now = Date.now();
    const token = issueFormToken(now - 10_000);
    expect(verifyFormToken(token, now)).toBe(true);
    expect(verifyFormToken(issueFormToken(now - 500), now)).toBe(false); // filled in half a second: a bot
    expect(verifyFormToken(issueFormToken(now - 2 * 86_400_000), now)).toBe(false); // stale page
    expect(verifyFormToken(token.replace(/.$/, (c) => (c === "a" ? "b" : "a")), now)).toBe(false); // forged
    expect(verifyFormToken("garbage", now)).toBe(false);
  });

  it("a hosted-form post with a too-fast or forged token is dropped silently", async () => {
    const base = { form_key: org.org.leadFormKey, nombre: "Bot", acepta_privacidad: "on" };
    const fast = await POST(post({ ...base, telefono: "4449400200", _t: issueFormToken(Date.now()) }, {}, true));
    const forged = await POST(post({ ...base, telefono: "4449400201", _t: "123.abc" }, {}, true));
    const human = await POST(post({ ...base, telefono: "4449400202", _t: issueFormToken(Date.now() - 8_000) }, {}, true));
    expect([fast.status, forged.status, human.status]).toEqual([200, 200, 200]);
    const phones = (await rootPrisma.lead.findMany({ where: { organizationId: org.org.id }, select: { phone: true } })).map((l) => l.phone);
    expect(phones).toEqual(["+524449400202"]);
  });
});
