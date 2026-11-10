import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AuthorizationPendingError } from "@/server/errors";
import { createQuote } from "@/server/services/quotes";
import { changeStage } from "@/server/services/pipeline";
import { createLeadManual } from "@/server/services/leads";
import { createDevelopment, createUnit } from "@/server/services/inventory";
import { updateOrganizationSettings } from "@/server/services/organization";
import { countPendingAuthorizations, decideAuthorization, listAuthorizationRequests } from "@/server/services/authorizations";
import { emailOutbox, resetOutbox } from "@/server/notify/email";
import { rootPrisma } from "@/server/db/root";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

describe("per-organization discount cap and authorization queue (pilot, item 5)", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  let other: Awaited<ReturnType<typeof makeOrg>>;
  let asesor: Awaited<ReturnType<typeof addMember>>;
  let asesor2: Awaited<ReturnType<typeof addMember>>;
  let devId: string;
  let n = 0;
  const phone = () => `+52444980${String(++n).padStart(4, "0")}`;
  const emailOf = async (userId: string) => (await rootPrisma.user.findUniqueOrThrow({ where: { id: userId } })).email;
  const mkUnit = async (code: string, price = 500000) =>
    (await createUnit(org.adminCtx, devId, { code, type: "LOTE", price, status: "DISPONIBLE" })).id;
  const setCap = (pct: number) =>
    updateOrganizationSettings(org.adminCtx, { name: "Cola Org", staleLeadHours: 24, maxAsesorDiscountPct: pct });

  beforeAll(async () => {
    org = await makeOrg("Cola Org");
    other = await makeOrg("Cola Otra");
    asesor = await addMember(org.org.id, "ASESOR");
    asesor2 = await addMember(org.org.id, "ASESOR");
    devId = (await createDevelopment(org.adminCtx, { name: "Dev Cola", city: "SLP" })).id;
  });
  beforeEach(async () => {
    resetOutbox();
    await setCap(5);
  });
  afterAll(cleanup);

  it("the cap is configurable per organization, default 5%", async () => {
    expect((await rootPrisma.organization.findUniqueOrThrow({ where: { id: other.org.id } })).maxAsesorDiscountPct).toBe(5);
    const unitId = await mkUnit("C-1");
    await setCap(10);
    await expect(createQuote(asesor.ctx, { unitId, discount: 50000, downPaymentPct: 10, months: 12, annualRatePct: 4 })).resolves.toBeTruthy(); // 10%, interest at the reference rate (QA2 B32)
    await expect(createQuote(asesor.ctx, { unitId, discount: 50001, downPaymentPct: 10, months: 12 })).rejects.toBeInstanceOf(AuthorizationPendingError);
    await expect(updateOrganizationSettings(asesor.ctx, { name: "x", staleLeadHours: 24, maxAsesorDiscountPct: 50 })).rejects.toThrow(/permiso/i);
    await expect(setCap(101)).rejects.toThrow(/0 y 100/);
    await expect(setCap(-1)).rejects.toThrow(/0 y 100/);
  });

  it("over the cap: no error screen, a pending request that reaches the admins by email", async () => {
    const unitId = await mkUnit("C-2");
    const { lead } = await createLeadManual(asesor.ctx, { firstName: "Cliente Descuento", phone: phone() });
    const err = await createQuote(asesor.ctx, { unitId, leadId: lead.id, discount: 100000, downPaymentPct: 10, months: 12 }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthorizationPendingError);
    expect(err.message).toMatch(/descuento máximo/i);
    expect(await rootPrisma.quote.count({ where: { unitId } })).toBe(0);
    const [req] = await rootPrisma.authorizationRequest.findMany({ where: { organizationId: org.org.id, unitId, status: "PENDIENTE" } });
    expect(req).toMatchObject({ kind: "DESCUENTO", requestedById: asesor.user.id, leadId: lead.id });
    expect(req.summary).toContain("C-2");
    const adminEmail = await emailOf(org.admin.id);
    const mail = emailOutbox.filter((m) => m.to === adminEmail);
    expect(mail).toHaveLength(1);
    expect(mail[0].subject).toMatch(/autoriza/i);
    expect(mail[0].text).toContain("Cliente Descuento");
    expect(await countPendingAuthorizations(org.adminCtx)).toBeGreaterThanOrEqual(1);
    expect(await countPendingAuthorizations(other.adminCtx)).toBe(0);
  });

  it("repeating the same request while it is pending does not pile up duplicates or emails", async () => {
    const unitId = await mkUnit("C-3");
    const ask = () => createQuote(asesor.ctx, { unitId, discount: 90000, downPaymentPct: 10, months: 12 }).catch((e) => e);
    await ask();
    resetOutbox();
    expect(await ask()).toBeInstanceOf(AuthorizationPendingError);
    expect(await rootPrisma.authorizationRequest.count({ where: { organizationId: org.org.id, unitId, status: "PENDIENTE" } })).toBe(1);
    expect(emailOutbox).toHaveLength(0);
  });

  it("approving creates the quote for the asesor with the requested discount and tells them", async () => {
    const unitId = await mkUnit("C-4");
    const { lead } = await createLeadManual(asesor.ctx, { firstName: "Aprobado", phone: phone() });
    await createQuote(asesor.ctx, { unitId, leadId: lead.id, discount: 100000, downPaymentPct: 20, months: 24 }).catch(() => {});
    const req = await rootPrisma.authorizationRequest.findFirstOrThrow({ where: { unitId, status: "PENDIENTE" } });
    resetOutbox();
    await decideAuthorization(org.adminCtx, req.id, { approve: true });
    const done = await rootPrisma.authorizationRequest.findUniqueOrThrow({ where: { id: req.id } });
    expect(done).toMatchObject({ status: "APROBADA", decidedById: org.admin.id });
    const quote = await rootPrisma.quote.findUniqueOrThrow({ where: { id: done.resultQuoteId! } });
    expect(quote.createdById).toBe(asesor.user.id); // the asesor stays the author
    expect(Number(quote.discount)).toBe(100000);
    expect((await rootPrisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).stage).toBe("COTIZACION");
    const mail = emailOutbox.filter((m) => m.to.includes("test-"));
    expect(mail.some((m) => /aprob/i.test(m.subject) && m.text.includes(`/app/cotizador/${quote.id}`))).toBe(true);
    await expect(decideAuthorization(org.adminCtx, req.id, { approve: false })).rejects.toThrow(/ya fue/i); // can't decide twice
  });

  it("rejecting records the reason, creates nothing and tells the asesor", async () => {
    const unitId = await mkUnit("C-5");
    await createQuote(asesor.ctx, { unitId, discount: 200000, downPaymentPct: 10, months: 12 }).catch(() => {});
    const req = await rootPrisma.authorizationRequest.findFirstOrThrow({ where: { unitId, status: "PENDIENTE" } });
    resetOutbox();
    await decideAuthorization(org.adminCtx, req.id, { approve: false, note: "Es demasiado, ofrece 5%" });
    const done = await rootPrisma.authorizationRequest.findUniqueOrThrow({ where: { id: req.id } });
    expect(done).toMatchObject({ status: "RECHAZADA", decisionNote: "Es demasiado, ofrece 5%", resultQuoteId: null });
    expect(await rootPrisma.quote.count({ where: { unitId } })).toBe(0);
    expect(emailOutbox.some((m) => /rechaz/i.test(m.subject) && m.text.includes("ofrece 5%"))).toBe(true);
  });

  it("visibility and permissions: asesores see only their own and cannot decide; other orgs cannot touch it", async () => {
    const unitId = await mkUnit("C-6");
    await createQuote(asesor.ctx, { unitId, discount: 150000, downPaymentPct: 10, months: 12 }).catch(() => {});
    const req = await rootPrisma.authorizationRequest.findFirstOrThrow({ where: { unitId, status: "PENDIENTE" } });
    expect((await listAuthorizationRequests(asesor.ctx)).some((r) => r.id === req.id)).toBe(true);
    expect((await listAuthorizationRequests(asesor2.ctx)).some((r) => r.id === req.id)).toBe(false);
    expect((await listAuthorizationRequests(org.adminCtx)).some((r) => r.id === req.id)).toBe(true);
    expect((await listAuthorizationRequests(other.adminCtx)).some((r) => r.id === req.id)).toBe(false);
    await expect(decideAuthorization(asesor.ctx, req.id, { approve: true })).rejects.toThrow(/permiso/i);
    await expect(decideAuthorization(other.adminCtx, req.id, { approve: true })).rejects.toThrow(/no encontrada/i);
    expect((await rootPrisma.authorizationRequest.findUniqueOrThrow({ where: { id: req.id } })).status).toBe("PENDIENTE");
  });

  it("a sale below the cap goes to the same queue and an approval registers it", async () => {
    const unitId = await mkUnit("C-7", 400000);
    const { lead } = await createLeadManual(asesor.ctx, { firstName: "Venta Baja", phone: phone(), unitId });
    const err = await changeStage(asesor.ctx, lead.id, { stage: "VENDIDO", saleAmount: 300000 }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthorizationPendingError);
    expect((await rootPrisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).stage).toBe("NUEVO");
    const req = await rootPrisma.authorizationRequest.findFirstOrThrow({ where: { leadId: lead.id, kind: "VENTA", status: "PENDIENTE" } });
    await decideAuthorization(org.adminCtx, req.id, { approve: true });
    const sold = await rootPrisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(sold.stage).toBe("VENDIDO");
    expect(Number(sold.saleAmount)).toBe(300000);
    expect((await rootPrisma.unit.findUniqueOrThrow({ where: { id: unitId } })).status).toBe("VENDIDO");
  });

  it("if the situation changed before approval (unit sold meanwhile), approval fails with a clear message and stays pending", async () => {
    const unitId = await mkUnit("C-8");
    await createQuote(asesor.ctx, { unitId, discount: 120000, downPaymentPct: 10, months: 12 }).catch(() => {});
    const req = await rootPrisma.authorizationRequest.findFirstOrThrow({ where: { unitId, status: "PENDIENTE" } });
    await rootPrisma.unit.update({ where: { id: unitId }, data: { status: "VENDIDO" } });
    await expect(decideAuthorization(org.adminCtx, req.id, { approve: true })).rejects.toThrow(/vendida/i);
    expect((await rootPrisma.authorizationRequest.findUniqueOrThrow({ where: { id: req.id } })).status).toBe("PENDIENTE");
  });
});
