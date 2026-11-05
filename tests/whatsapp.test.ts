import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/webhooks/whatsapp/route";
import {
  buildInboundTextPayload,
  parseWebhookPayload,
  signBody,
  verifySignature,
} from "@/server/whatsapp/webhook-format";
import { CloudApiWhatsAppProvider, MockWhatsAppProvider, setWhatsAppProviderForTests } from "@/server/whatsapp/providers";
import { renderTemplate, TEMPLATES } from "@/server/whatsapp/templates";
import { sendTemplateToLead, sendTextToLead } from "@/server/services/whatsapp";
import { createLeadManual, recordConsent } from "@/server/services/leads";
import { rootPrisma } from "@/server/db/root";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

const SECRET = process.env.WHATSAPP_APP_SECRET ?? "dev-app-secret";

function webhookPost(payload: unknown, signature?: string) {
  const raw = JSON.stringify(payload);
  return new NextRequest("http://localhost/api/webhooks/whatsapp", {
    method: "POST",
    headers: { "content-type": "application/json", "x-hub-signature-256": signature ?? signBody(raw, SECRET) },
    body: raw,
  });
}

describe("webhook format", () => {
  it("verifies HMAC signatures", () => {
    const body = '{"a":1}';
    expect(verifySignature(body, signBody(body, "s3cret"), "s3cret")).toBe(true);
    expect(verifySignature(body, signBody(body, "otro"), "s3cret")).toBe(false);
    expect(verifySignature(body, null, "s3cret")).toBe(false);
    expect(verifySignature(body, "sha256=zz", "s3cret")).toBe(false);
    expect(verifySignature(body, signBody(body, "s3cret"), undefined)).toBe(false);
  });

  it("parses messages (MX 521 numbers) and statuses", () => {
    const payload = buildInboundTextPayload({ phoneNumberId: "PN1", fromDigits: "5214441112233", text: "Hola", name: "Ana Ruiz", id: "wamid.1" });
    (payload.entry[0].changes[0].value as Record<string, unknown>).statuses = [
      { id: "wamid.out", status: "read" },
      { id: "wamid.bad", status: "weird" },
    ];
    const events = parseWebhookPayload(payload);
    expect(events[0]).toMatchObject({ kind: "message", from: "+524441112233", text: "Hola", profileName: "Ana Ruiz", phoneNumberId: "PN1" });
    expect(events[1]).toMatchObject({ kind: "status", providerId: "wamid.out", status: "read" });
    expect(events).toHaveLength(2);
    expect(parseWebhookPayload({ object: "page" })).toEqual([]);
    expect(parseWebhookPayload(null)).toEqual([]);
  });

  it("renders templates", () => {
    expect(renderTemplate(TEMPLATES[0], ["Ana", "Lomas", "Beto"])).toContain("Hola Ana, gracias por tu interés en Lomas. Soy Beto");
  });
});

describe("Cloud API provider", () => {
  it("sends templates in Meta's format and returns the wamid", async () => {
    let captured: { url: string; init: RequestInit } | null = null;
    const fakeFetch = (async (url: string, init: RequestInit) => {
      captured = { url, init };
      return new Response(JSON.stringify({ messages: [{ id: "wamid.XYZ" }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const p = new CloudApiWhatsAppProvider("TOKEN", "v23.0", fakeFetch);
    const r = await p.sendTemplate({ fromPhoneNumberId: "123", to: "+524441234567", template: "bienvenida_prospecto", language: "es_MX", variables: ["Ana"] });
    expect(r).toEqual({ ok: true, providerId: "wamid.XYZ" });
    expect(captured!.url).toBe("https://graph.facebook.com/v23.0/123/messages");
    expect((captured!.init.headers as Record<string, string>).Authorization).toBe("Bearer TOKEN");
    const body = JSON.parse(String(captured!.init.body));
    expect(body).toMatchObject({
      messaging_product: "whatsapp",
      to: "524441234567",
      type: "template",
      template: { name: "bienvenida_prospecto", language: { code: "es_MX" }, components: [{ type: "body", parameters: [{ type: "text", text: "Ana" }] }] },
    });
  });

  it("maps API errors and missing phone number id", async () => {
    const fakeFetch = (async () =>
      new Response(JSON.stringify({ error: { message: "Template not found" } }), { status: 404 })) as unknown as typeof fetch;
    const p = new CloudApiWhatsAppProvider("T", "v23.0", fakeFetch);
    expect(await p.sendText({ fromPhoneNumberId: "1", to: "+524441234567", body: "x" })).toEqual({ ok: false, error: "WhatsApp 404: Template not found" });
    expect((await p.sendText({ fromPhoneNumberId: null, to: "+524441234567", body: "x" })).ok).toBe(false);
  });
});

describe("WhatsApp webhook route and messaging", () => {
  let a: Awaited<ReturnType<typeof makeOrg>>;
  let b: Awaited<ReturnType<typeof makeOrg>>;
  const mock = new MockWhatsAppProvider();

  beforeAll(async () => {
    setWhatsAppProviderForTests(mock);
    a = await makeOrg("WA A");
    b = await makeOrg("WA B");
    await rootPrisma.organization.update({ where: { id: a.org.id }, data: { waPhoneNumberId: `PN-A-${Date.now()}` } });
    await rootPrisma.organization.update({ where: { id: b.org.id }, data: { waPhoneNumberId: `PN-B-${Date.now()}` } });
  });
  afterAll(async () => {
    setWhatsAppProviderForTests(null);
    await cleanup();
  });

  const pnA = async () => (await rootPrisma.organization.findUniqueOrThrow({ where: { id: a.org.id } })).waPhoneNumberId!;

  it("GET verifies the subscription token", async () => {
    const ok = await GET(new NextRequest(`http://x/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${process.env.WHATSAPP_VERIFY_TOKEN}&hub.challenge=42`));
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("42");
    const bad = await GET(new NextRequest("http://x/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=42"));
    expect(bad.status).toBe(403);
  });

  it("rejects unsigned or badly signed posts", async () => {
    const payload = buildInboundTextPayload({ phoneNumberId: await pnA(), fromDigits: "524449990001", text: "x", id: "wamid.sig" });
    expect((await POST(webhookPost(payload, "sha256=00"))).status).toBe(401);
    expect(await rootPrisma.whatsAppMessage.count({ where: { providerId: "wamid.sig" } })).toBe(0);
  });

  it("creates a lead from an unknown number in the right org, idempotently", async () => {
    const id = `wamid.new.${Date.now()}`;
    const payload = buildInboundTextPayload({ phoneNumberId: await pnA(), fromDigits: "5214449990002", text: "Info del lote 5", name: "Pedro Gómez", id });
    const res = await POST(webhookPost(payload));
    expect(res.status).toBe(200);
    expect((await res.json()).messages).toBe(1);
    const again = await POST(webhookPost(payload));
    expect((await again.json()).duplicates).toBe(1);

    const lead = await rootPrisma.lead.findFirstOrThrow({ where: { phone: "+524449990002" }, include: { messages: true } });
    expect(lead.organizationId).toBe(a.org.id);
    expect(lead).toMatchObject({ firstName: "Pedro", lastName: "Gómez", source: "WHATSAPP", channel: "WHATSAPP" });
    expect(lead.messages).toHaveLength(1);
    expect(lead.lastInboundAt).not.toBeNull();
    expect(lead.consentAt).toBeNull();
    expect(await rootPrisma.lead.count({ where: { organizationId: b.org.id } })).toBe(0);
  });

  it("ignores events for unknown phone number ids", async () => {
    const payload = buildInboundTextPayload({ phoneNumberId: "UNKNOWN", fromDigits: "524449990003", text: "x", id: "wamid.unknown" });
    expect((await (await POST(webhookPost(payload))).json()).ignored).toBe(1);
  });

  it("free-text replies only inside the 24 h window; templates need consent", async () => {
    const lead = await rootPrisma.lead.findFirstOrThrow({ where: { phone: "+524449990002" } });
    // replying to someone who wrote first is allowed (within 24 h)
    const r = await sendTextToLead(a.adminCtx, lead.id, "¡Hola Pedro! Te comparto la info.");
    expect(r.ok).toBe(true);
    // but proactive templates need consent
    await expect(sendTemplateToLead(a.adminCtx, lead.id, "seguimiento_prospecto", ["Pedro", "Ana", "Org"])).rejects.toThrow(/consentimiento/);
    await recordConsent(a.adminCtx, lead.id, true);
    const t = await sendTemplateToLead(a.adminCtx, lead.id, "seguimiento_prospecto", ["Pedro", "Ana", "Org"]);
    expect(t.ok).toBe(true);
    // window closed
    await rootPrisma.lead.update({ where: { id: lead.id }, data: { lastInboundAt: new Date(Date.now() - 25 * 3_600_000) } });
    await expect(sendTextToLead(a.adminCtx, lead.id, "hola")).rejects.toThrow(/24 h/);
    const updated = await rootPrisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updated.firstContactAt).not.toBeNull(); // outbound WhatsApp counts as contact
    expect(updated.stage).toBe("CONTACTADO");
  });

  it("applies delivery statuses without downgrading", async () => {
    const msg = await rootPrisma.whatsAppMessage.findFirstOrThrow({ where: { organizationId: a.org.id, direction: "SALIENTE", status: "ENVIADO" } });
    const pn = await pnA();
    const build = (status: string) => ({
      object: "whatsapp_business_account",
      entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: pn }, statuses: [{ id: msg.providerId, status }] } }] }],
    });
    await POST(webhookPost(build("read")));
    await POST(webhookPost(build("delivered")));
    expect((await rootPrisma.whatsAppMessage.findUniqueOrThrow({ where: { id: msg.id } })).status).toBe("LEIDO");
  });

  it("asesor cannot message leads assigned to someone else", async () => {
    const asesor = await addMember(a.org.id, "ASESOR");
    const { lead } = await createLeadManual(a.adminCtx, { firstName: "Ajeno", phone: "+524449990009" });
    await expect(sendTemplateToLead(asesor.ctx, lead.id, "seguimiento_prospecto", ["a", "b", "c"])).rejects.toThrow(/no encontrado/i);
  });

  it("validates template variables", async () => {
    const { lead } = await createLeadManual(a.adminCtx, { firstName: "Vars", phone: "+524449990010" });
    await expect(sendTemplateToLead(a.adminCtx, lead.id, "seguimiento_prospecto", ["solo una"])).rejects.toThrow(/variables/);
    await expect(sendTemplateToLead(a.adminCtx, lead.id, "no_existe", [])).rejects.toThrow(/desconocida/);
  });
});
