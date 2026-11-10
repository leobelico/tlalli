import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/public/leads/route";
import { rootPrisma } from "@/server/db/root";
import { clientIp } from "@/lib/client-ip";
import { resetSharedRateLimits } from "@/server/public/rate-limit";
import { issueFormToken } from "@/server/public/form-token";
import { cleanup, makeOrg } from "./helpers/factory";

const post = (body: Record<string, unknown>, headers: Record<string, string> = {}, form = false) =>
  new NextRequest("http://localhost/api/public/leads", {
    method: "POST",
    headers: { "content-type": form ? "application/x-www-form-urlencoded" : "application/json", ...headers },
    body: form ? new URLSearchParams(body as Record<string, string>).toString() : JSON.stringify(body),
  });

/** QA2 B34: one origin must not be able to lock the form for everybody else, and no proxy setting must not mean no protection. */
describe("public intake limits are safe by default (QA2 B34)", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  let other: Awaited<ReturnType<typeof makeOrg>>;
  const saved = { proxy: process.env.TRUSTED_PROXY, vercel: process.env.VERCEL };
  let n = 0;
  const phone = () => `44495${String(++n).padStart(5, "0")}`;
  const hostedPost = (o: typeof org, extra: Record<string, string> = {}) =>
    POST(post({ form_key: o.org.leadFormKey, nombre: "Persona", telefono: phone(), acepta_privacidad: "on", _t: issueFormToken(Date.now() - 6_000), ...extra }, {}, true));

  beforeAll(async () => {
    org = await makeOrg("Límites Org");
    other = await makeOrg("Límites Otra");
  });
  beforeEach(async () => {
    await resetSharedRateLimits();
    delete process.env.TRUSTED_PROXY;
    delete process.env.VERCEL;
  });
  afterAll(async () => {
    for (const [k, v] of [["TRUSTED_PROXY", saved.proxy], ["VERCEL", saved.vercel]] as const) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    await cleanup();
  });

  it("on Vercel the platform header is trusted even if TRUSTED_PROXY was forgotten", () => {
    const h = new Headers({ "x-forwarded-for": "6.6.6.6", "x-vercel-forwarded-for": "8.8.8.8" });
    expect(clientIp(h)).toBeNull(); // not on Vercel, nothing configured: no identity
    process.env.VERCEL = "1";
    expect(clientIp(h)).toBe("8.8.8.8");
    process.env.TRUSTED_PROXY = "none"; // an explicit choice still wins
    expect(clientIp(h)).toBeNull();
  });

  it("a script hammering the API cannot lock out people using the hosted form", async () => {
    const key = { "x-form-key": org.org.leadFormKey };
    const codes: number[] = [];
    for (let i = 0; i < 150; i++) codes.push((await POST(post({ nombre: "x", telefono: "abc", acepta_privacidad: false }, key))).status);
    expect(codes).toContain(429); // the anonymous lane has its own, smaller budget...
    const human = await hostedPost(org);
    expect(human.status).toBe(200); // ...and the hosted form is not in it
    expect(await rootPrisma.lead.count({ where: { organizationId: org.org.id } })).toBe(1);
  });

  it("one organization's flood does not affect another", async () => {
    for (let i = 0; i < 150; i++) await POST(post({ nombre: "x", telefono: "abc", acepta_privacidad: false }, { "x-form-key": org.org.leadFormKey }));
    const res = await POST(post({ nombre: "Otra", telefono: phone(), acepta_privacidad: true }, { "x-form-key": other.org.leadFormKey }));
    expect(res.status).toBe(200);
  });

  it("a form token cannot be harvested once and replayed: a few uses and it stops creating leads", async () => {
    const _t = issueFormToken(Date.now() - 6_000);
    const before = await rootPrisma.lead.count({ where: { organizationId: other.org.id } });
    for (let i = 0; i < 8; i++) {
      const res = await POST(post({ form_key: other.org.leadFormKey, nombre: "Replay", telefono: phone(), acepta_privacidad: "on", _t }, {}, true));
      expect(res.status).toBe(200); // always neutral
    }
    expect((await rootPrisma.lead.count({ where: { organizationId: other.org.id } })) - before).toBeLessThanOrEqual(3);
  });

  it("with a trusted proxy, the per-IP limit still cuts a single origin quickly and hosted-form visitors elsewhere are unaffected", async () => {
    process.env.TRUSTED_PROXY = "xff:1";
    const bot = { "x-form-key": org.org.leadFormKey, "x-forwarded-for": "198.51.100.7" };
    const codes: number[] = [];
    for (let i = 0; i < 40; i++) codes.push((await POST(post({ nombre: "x", telefono: "abc", acepta_privacidad: false }, bot))).status);
    expect(codes.filter((c) => c === 429).length).toBeGreaterThanOrEqual(15);
    const visitor = await POST(post({ form_key: org.org.leadFormKey, nombre: "Visita", telefono: phone(), acepta_privacidad: "on", _t: issueFormToken(Date.now() - 6_000) }, { "x-forwarded-for": "203.0.113.9" }, true));
    expect(visitor.status).toBe(200);
    expect(await rootPrisma.lead.count({ where: { organizationId: org.org.id, firstName: "Visita" } })).toBe(1);
  });
});

describe("response time does not reveal whether a phone already exists (QA2 B43)", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  beforeAll(async () => {
    org = await makeOrg("Tiempo Org");
  });
  beforeEach(() => resetSharedRateLimits());
  afterAll(cleanup);

  it("every accepted answer takes at least the same floor, new phone or existing", async () => {
    const send = async (phone: string) => {
      const t = performance.now();
      const res = await POST(post({ nombre: "Tiempo", telefono: phone, acepta_privacidad: true }, { "x-form-key": org.org.leadFormKey }));
      expect(res.status).toBe(200);
      return performance.now() - t;
    };
    const first = await send("4449700001"); // new
    const again = await send("4449700001"); // existing
    expect(first).toBeGreaterThanOrEqual(100);
    expect(again).toBeGreaterThanOrEqual(100);
    expect(Math.abs(first - again)).toBeLessThan(80);
  });
});
