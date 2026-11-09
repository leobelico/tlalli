import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST, OPTIONS } from "@/app/api/public/leads/route";
import { rootPrisma } from "@/server/db/root";
import { createCampaign } from "@/server/services/campaigns";
import { resetSharedRateLimits } from "@/server/public/rate-limit";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

let ipCounter = 0;
function req(body: unknown, opts: { key?: string; contentType?: string; ip?: string } = {}) {
  const contentType = opts.contentType ?? "application/json";
  const headers: Record<string, string> = {
    "content-type": contentType,
    "x-forwarded-for": opts.ip ?? `10.0.0.${++ipCounter}`,
    "user-agent": "vitest",
  };
  if (opts.key) headers["x-form-key"] = opts.key;
  const payload =
    contentType === "application/json"
      ? JSON.stringify(body)
      : typeof body === "string"
        ? body
        : new URLSearchParams(body as Record<string, string>).toString();
  return new NextRequest("http://localhost/api/public/leads", { method: "POST", headers, body: payload });
}

describe("POST /api/public/leads (web form webhook)", () => {
  let a: Awaited<ReturnType<typeof makeOrg>>;
  let b: Awaited<ReturnType<typeof makeOrg>>;
  let asesorId: string;
  const valid = { nombre: "María", apellido: "López", telefono: "444 555 0001", acepta_privacidad: true };

  beforeAll(async () => {
    a = await makeOrg("Webhook A");
    b = await makeOrg("Webhook B");
    asesorId = (await addMember(a.org.id, "ASESOR")).user.id;
    await createCampaign(a.adminCtx, { name: "Radio Exa", channel: "RADIO", code: "RAD-EXA" });
    await createCampaign(b.adminCtx, { name: "Solo B", channel: "GOOGLE", code: "GOO-B" });
  });
  beforeEach(() => resetSharedRateLimits());
  afterAll(cleanup);

  it("answers CORS preflight", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("rejects missing or wrong form keys", async () => {
    expect((await POST(req(valid))).status).toBe(401);
    expect((await POST(req(valid, { key: "lfk_" + "x".repeat(32) }))).status).toBe(401);
  });

  it("creates a lead with campaign, consent and auto-assignment", async () => {
    const res = await POST(
      req({ ...valid, campana: "rad-exa", mensaje: "Me interesa un lote" }, { key: a.org.leadFormKey }),
    );
    // QA B15: neutral answer, no internal id; look the lead up by phone.
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const lead = await rootPrisma.lead.findFirstOrThrow({
      where: { organizationId: a.org.id, phone: "+524445550001" },
      include: { campaign: true, consents: true, activities: true },
    });
    expect(lead.organizationId).toBe(a.org.id);
    expect(lead.phone).toBe("+524445550001");
    expect(lead.campaign?.code).toBe("RAD-EXA");
    expect(lead.channel).toBe("RADIO");
    expect(lead.source).toBe("WEBHOOK");
    expect(lead.assignedToId).toBe(asesorId); // asesores preferred over admins
    expect(lead.consentAt).not.toBeNull();
    expect(lead.consents[0]).toMatchObject({ granted: true, source: "WEBHOOK", userAgent: "vitest" });
    expect(lead.consents[0].privacyNoticeId).not.toBeNull();
    expect(lead.activities[0].body).toContain("Me interesa un lote");
  });

  it("deduplicates by phone and logs the new touch", async () => {
    const res = await POST(req({ ...valid, telefono: "+52 1 444 555 0001" }, { key: a.org.leadFormKey }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true }); // QA B15: same answer as a new lead
    expect(await rootPrisma.lead.count({ where: { organizationId: a.org.id, phone: "+524445550001" } })).toBe(1);
  });

  it("requires privacy consent", async () => {
    const res = await POST(
      req({ ...valid, telefono: "4445550002", acepta_privacidad: false }, { key: a.org.leadFormKey }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).fields.acepta_privacidad).toBeDefined();
  });

  it("validates phone and name", async () => {
    const res = await POST(req({ telefono: "123", acepta_privacidad: true }, { key: a.org.leadFormKey }));
    expect(res.status).toBe(400);
    const { fields } = await res.json();
    expect(Object.keys(fields)).toEqual(expect.arrayContaining(["nombre", "telefono"]));
  });

  it("does not attach a campaign code that belongs to another org", async () => {
    const res = await POST(req({ ...valid, telefono: "4445550003", campana: "GOO-B" }, { key: a.org.leadFormKey }));
    expect(res.status).toBe(200);
    const lead = await rootPrisma.lead.findFirstOrThrow({
      where: { organizationId: a.org.id, phone: "+524445550003" },
      include: { activities: true },
    });
    expect(lead.campaignId).toBeNull();
    expect(lead.channel).toBe("SITIO_WEB");
    expect(lead.activities[0].body).toContain("desconocido");
  });

  it("silently drops honeypot submissions", async () => {
    const res = await POST(
      req({ ...valid, telefono: "4445550004", website: "http://spam" }, { key: a.org.leadFormKey }),
    );
    expect(res.status).toBe(200);
    expect(await rootPrisma.lead.count({ where: { phone: "+524445550004" } })).toBe(0);
  });

  it("accepts HTML form posts with English aliases and redirects", async () => {
    const res = await POST(
      req(
        {
          form_key: a.org.leadFormKey,
          name: "Pedro",
          phone: "4445550005",
          consent: "on",
          redirect: "https://ejemplo.mx/gracias",
        },
        { contentType: "application/x-www-form-urlencoded" },
      ),
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://ejemplo.mx/gracias");
    expect(await rootPrisma.lead.count({ where: { organizationId: a.org.id, phone: "+524445550005" } })).toBe(1);
  });

  it("ignores javascript: redirects", async () => {
    const res = await POST(
      req(
        {
          form_key: a.org.leadFormKey,
          nombre: "Eva",
          telefono: "4445550006",
          acepta_privacidad: "si",
          redirect: "javascript:alert(1)",
        },
        { contentType: "application/x-www-form-urlencoded" },
      ),
    );
    expect(res.status).toBe(200); // no redirect to a javascript: URL, neutral answer instead
    expect(res.headers.get("location")).toBeNull();
  });

  it("rejects malformed JSON and unsupported content types", async () => {
    const bad = new NextRequest("http://localhost/api/public/leads", {
      method: "POST",
      headers: { "content-type": "application/json", "x-form-key": a.org.leadFormKey },
      body: "{nope",
    });
    expect((await POST(bad)).status).toBe(400);
    expect((await POST(req("hola", { key: a.org.leadFormKey, contentType: "text/plain" }))).status).toBe(415);
  });

  it("rate limits by IP when the proxy is trusted (QA B16)", async () => {
    const prev = process.env.TRUSTED_PROXY;
    process.env.TRUSTED_PROXY = "xff:1";
    const statuses: number[] = [];
    for (let i = 0; i < 22; i++) {
      const r = await POST(req({ nombre: "x" }, { key: a.org.leadFormKey, ip: "9.9.9.9" }));
      statuses.push(r.status);
    }
    expect(statuses.slice(0, 20).every((s) => s === 400)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
    if (prev === undefined) delete process.env.TRUSTED_PROXY;
    else process.env.TRUSTED_PROXY = prev;
  });

  it("org B never receives org A leads", async () => {
    expect(await rootPrisma.lead.count({ where: { organizationId: b.org.id } })).toBe(0);
  });
});
