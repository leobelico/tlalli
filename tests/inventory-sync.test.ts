import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { changeStage } from "@/server/services/pipeline";
import { createLeadManual, updateLead } from "@/server/services/leads";
import { createDevelopment, createUnit, setUnitStatus } from "@/server/services/inventory";
import { createQuote } from "@/server/services/quotes";
import { rootPrisma } from "@/server/db/root";
import { cleanup, makeOrg } from "./helpers/factory";

describe("inventory <-> lead sync (QA B01-B03)", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  let devId: string;
  let n = 0;
  const phone = () => `+52444900${String(++n).padStart(4, "0")}`;
  const unitStatus = async (id: string) => (await rootPrisma.unit.findUniqueOrThrow({ where: { id } })).status;
  const mkUnit = async (code: string) =>
    (await createUnit(org.adminCtx, devId, { code, type: "LOTE", price: 480000, status: "DISPONIBLE" })).id;

  beforeAll(async () => {
    org = await makeOrg("Sync Org");
    devId = (await createDevelopment(org.adminCtx, { name: "Sync Dev", city: "SLP" })).id;
  });
  afterAll(cleanup);

  it("B01: cannot free a unit that has an active apartado, so it can't be booked twice", async () => {
    const unitId = await mkUnit("B01-1");
    const { lead } = await createLeadManual(org.adminCtx, { firstName: "Uno", phone: phone(), unitId });
    await changeStage(org.adminCtx, lead.id, { stage: "APARTADO" });
    await expect(setUnitStatus(org.adminCtx, unitId, "DISPONIBLE")).rejects.toThrow(/apartad/i);
    expect(await unitStatus(unitId)).toBe("APARTADO");
    // The same guard applies to a sold unit.
    await changeStage(org.adminCtx, lead.id, { stage: "VENDIDO" });
    await expect(setUnitStatus(org.adminCtx, unitId, "DISPONIBLE")).rejects.toThrow(/vendid|apartad/i);
  });

  it("B01: a unit nobody holds can still be freed manually", async () => {
    const unitId = await mkUnit("B01-2");
    await setUnitStatus(org.adminCtx, unitId, "APARTADO");
    await setUnitStatus(org.adminCtx, unitId, "DISPONIBLE");
    expect(await unitStatus(unitId)).toBe("DISPONIBLE");
  });

  it("B01: the database refuses two leads holding the same unit", async () => {
    const unitId = await mkUnit("B01-3");
    const a = await createLeadManual(org.adminCtx, { firstName: "A", phone: phone(), unitId });
    const b = await createLeadManual(org.adminCtx, { firstName: "B", phone: phone(), unitId });
    await rootPrisma.lead.update({ where: { id: a.lead.id }, data: { stage: "APARTADO" } });
    await expect(rootPrisma.lead.update({ where: { id: b.lead.id }, data: { stage: "APARTADO" } })).rejects.toThrow();
  });

  it("B02: changing the unit of an apartado lead moves the reservation", async () => {
    const u1 = await mkUnit("B02-1");
    const u2 = await mkUnit("B02-2");
    const { lead } = await createLeadManual(org.adminCtx, { firstName: "Mueve", phone: phone(), unitId: u1 });
    await changeStage(org.adminCtx, lead.id, { stage: "APARTADO" });
    await updateLead(org.adminCtx, lead.id, { firstName: "Mueve", phone: lead.phone, unitId: u2 });
    expect(await unitStatus(u1)).toBe("DISPONIBLE");
    expect(await unitStatus(u2)).toBe("APARTADO");
  });

  it("B02: refuses to move an apartado lead onto a unit someone else holds", async () => {
    const u1 = await mkUnit("B02-3");
    const u2 = await mkUnit("B02-4");
    const other = await createLeadManual(org.adminCtx, { firstName: "Otro", phone: phone(), unitId: u2 });
    await changeStage(org.adminCtx, other.lead.id, { stage: "APARTADO" });
    const { lead } = await createLeadManual(org.adminCtx, { firstName: "Quiere", phone: phone(), unitId: u1 });
    await changeStage(org.adminCtx, lead.id, { stage: "APARTADO" });
    await expect(
      updateLead(org.adminCtx, lead.id, { firstName: "Quiere", phone: lead.phone, unitId: u2 }),
    ).rejects.toThrow(/apartad/i);
    expect(await unitStatus(u1)).toBe("APARTADO");
  });

  it("B03: quoting links the unit to the lead, so selling it updates the inventory", async () => {
    const unitId = await mkUnit("B03-1");
    const { lead } = await createLeadManual(org.adminCtx, { firstName: "Cotiza", phone: phone() });
    expect(lead.unitId).toBeNull();
    await createQuote(org.adminCtx, { unitId, leadId: lead.id, downPaymentPct: 20, months: 12 });
    const after = await rootPrisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(after.unitId).toBe(unitId);
    expect(after.developmentId).toBe(devId);
    await changeStage(org.adminCtx, lead.id, { stage: "VENDIDO" });
    expect(await unitStatus(unitId)).toBe("VENDIDO");
  });
});
