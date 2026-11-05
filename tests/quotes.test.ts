import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createQuote, getQuote } from "@/server/services/quotes";
import { createDevelopment, createUnit } from "@/server/services/inventory";
import { createLeadManual } from "@/server/services/leads";
import { renderQuotePdf } from "@/server/pdf/quote-pdf";
import { rootPrisma } from "@/server/db/root";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

describe("quotes service and PDF", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  let other: Awaited<ReturnType<typeof makeOrg>>;
  let asesor: Awaited<ReturnType<typeof addMember>>;
  let unitId: string;

  beforeAll(async () => {
    org = await makeOrg("Cotizaciones");
    other = await makeOrg("Otra");
    asesor = await addMember(org.org.id, "ASESOR");
    const dev = await createDevelopment(org.adminCtx, { name: "Lomas Ñandú", city: "San Luis Potosí" });
    unitId = (await createUnit(org.adminCtx, dev.id, { code: "Lote 3", type: "LOTE", areaM2: 160, price: 600000, status: "DISPONIBLE" })).id;
  });
  afterAll(cleanup);

  it("stores server-computed amounts (client cannot tamper with the price)", async () => {
    const q = await createQuote(asesor.ctx, { unitId, downPaymentPct: 20, months: 24 });
    expect(Number(q.price)).toBe(600000);
    expect(Number(q.monthlyPayment)).toBe(20000);
    expect(Number(q.totalPaid)).toBe(600000);
  });

  it("moves an early-stage lead to Cotización and logs it", async () => {
    const { lead } = await createLeadManual(asesor.ctx, { firstName: "Cliente", phone: "+524441110001" });
    await createQuote(asesor.ctx, { unitId, leadId: lead.id, downPaymentPct: 10, months: 12, annualRatePct: 10 });
    const after = await rootPrisma.lead.findUniqueOrThrow({ where: { id: lead.id }, include: { activities: true } });
    expect(after.stage).toBe("COTIZACION");
    expect(after.activities.some((a) => a.body.startsWith("Cotización de Lote 3"))).toBe(true);
  });

  it("rejects invalid plans and sold units", async () => {
    await expect(createQuote(asesor.ctx, { unitId, downPaymentPct: 120, months: 12 })).rejects.toThrow(/enganche/);
    await rootPrisma.unit.update({ where: { id: unitId }, data: { status: "VENDIDO" } });
    await expect(createQuote(asesor.ctx, { unitId, downPaymentPct: 10, months: 12 })).rejects.toThrow(/vendida/);
    await rootPrisma.unit.update({ where: { id: unitId }, data: { status: "DISPONIBLE" } });
  });

  it("isolates quotes between organizations and asesores", async () => {
    const q = await createQuote(org.adminCtx, { unitId, downPaymentPct: 30, months: 6 });
    await expect(getQuote(other.adminCtx, q.id)).rejects.toThrow(/no encontrada/i);
    await expect(createQuote(other.adminCtx, { unitId, downPaymentPct: 30, months: 6 })).rejects.toThrow(/no encontrada/i);
    await expect(getQuote(asesor.ctx, q.id)).rejects.toThrow(/no encontrada/i); // admin's quote, no lead
  });

  it("renders a valid PDF even with accents and unsupported characters", async () => {
    const { lead } = await createLeadManual(asesor.ctx, { firstName: "José 😀", lastName: "Peña", phone: "+524441110002" });
    const q = await createQuote(asesor.ctx, { unitId, leadId: lead.id, discount: 10000, downPaymentPct: 15, months: 18, annualRatePct: 8 });
    const bytes = await renderQuotePdf(await getQuote(asesor.ctx, q.id));
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1500);
  });
});
