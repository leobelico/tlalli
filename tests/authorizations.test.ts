import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { changeStage } from "@/server/services/pipeline";
import { createLeadManual } from "@/server/services/leads";
import { createDevelopment, createUnit } from "@/server/services/inventory";
import { createQuote } from "@/server/services/quotes";
import { ASESOR_MAX_DISCOUNT_PCT } from "@/lib/policy";
import { rootPrisma } from "@/server/db/root";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

describe("authorizations: discounts and sales (QA B04, B05)", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  let asesor: Awaited<ReturnType<typeof addMember>>;
  let devId: string;
  let n = 0;
  const phone = () => `+52444910${String(++n).padStart(4, "0")}`;
  const mkUnit = async (code: string, price = 400000) =>
    (await createUnit(org.adminCtx, devId, { code, type: "LOTE", price, status: "DISPONIBLE" })).id;

  beforeAll(async () => {
    org = await makeOrg("Autorizaciones");
    asesor = await addMember(org.org.id, "ASESOR");
    devId = (await createDevelopment(org.adminCtx, { name: "Dev Aut", city: "SLP" })).id;
  });
  afterAll(cleanup);

  it("B05: an asesor cannot quote a discount above the cap, an admin can", async () => {
    const unitId = await mkUnit("D-1");
    const cap = (400000 * ASESOR_MAX_DISCOUNT_PCT) / 100;
    await expect(createQuote(asesor.ctx, { unitId, discount: cap + 1, downPaymentPct: 10, months: 12 })).rejects.toThrow(
      /descuento máximo/i,
    );
    await expect(createQuote(asesor.ctx, { unitId, discount: cap, downPaymentPct: 10, months: 12 })).resolves.toBeTruthy();
    await expect(createQuote(org.adminCtx, { unitId, discount: 399999, downPaymentPct: 10, months: 12 })).resolves.toBeTruthy();
  });

  it("B04: an asesor cannot register a sale far below the unit price", async () => {
    const unitId = await mkUnit("S-1");
    const { lead } = await createLeadManual(asesor.ctx, { firstName: "Compra", phone: phone(), unitId });
    await expect(changeStage(asesor.ctx, lead.id, { stage: "VENDIDO", saleAmount: 1 })).rejects.toThrow(/descuento|administrador/i);
    const still = await rootPrisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(still.stage).toBe("NUEVO");
    expect((await rootPrisma.unit.findUniqueOrThrow({ where: { id: unitId } })).status).toBe("DISPONIBLE");
  });

  it("B04: an asesor can sell at list price or within the cap (default = unit price)", async () => {
    const unitId = await mkUnit("S-2");
    const { lead } = await createLeadManual(asesor.ctx, { firstName: "Compra2", phone: phone(), unitId });
    const sold = await changeStage(asesor.ctx, lead.id, { stage: "VENDIDO" });
    expect(Number(sold.saleAmount)).toBe(400000);
    const unit2 = await mkUnit("S-3");
    const { lead: l2 } = await createLeadManual(asesor.ctx, { firstName: "Compra3", phone: phone(), unitId: unit2 });
    const within = 400000 * (1 - ASESOR_MAX_DISCOUNT_PCT / 100);
    expect(Number((await changeStage(asesor.ctx, l2.id, { stage: "VENDIDO", saleAmount: within })).saleAmount)).toBe(within);
  });

  it("B04: an asesor cannot mark a sale with no unit linked (the amount would be unverifiable)", async () => {
    const { lead } = await createLeadManual(asesor.ctx, { firstName: "SinUnidad", phone: phone() });
    await expect(changeStage(asesor.ctx, lead.id, { stage: "VENDIDO", saleAmount: 5000 })).rejects.toThrow(/unidad/i);
  });

  it("B04: an admin can override the amount, but never zero or negative", async () => {
    const unitId = await mkUnit("S-4");
    const { lead } = await createLeadManual(org.adminCtx, { firstName: "Admin", phone: phone(), unitId });
    await expect(changeStage(org.adminCtx, lead.id, { stage: "VENDIDO", saleAmount: 0 })).rejects.toThrow(/mayor a 0/);
    await expect(changeStage(org.adminCtx, lead.id, { stage: "VENDIDO", saleAmount: -5 })).rejects.toThrow(/mayor a 0/);
    const sold = await changeStage(org.adminCtx, lead.id, { stage: "VENDIDO", saleAmount: 350000 });
    expect(Number(sold.saleAmount)).toBe(350000);
  });
});
