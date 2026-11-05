import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { changeStage, getPipeline } from "@/server/services/pipeline";
import { createLeadManual } from "@/server/services/leads";
import { createDevelopment, createUnit } from "@/server/services/inventory";
import { rootPrisma } from "@/server/db/root";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

describe("pipeline stage changes", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  let asesor: Awaited<ReturnType<typeof addMember>>;
  let unitId: string;
  let n = 0;
  const phone = () => `+52444800${String(++n).padStart(4, "0")}`;

  beforeAll(async () => {
    org = await makeOrg("Pipeline Org");
    asesor = await addMember(org.org.id, "ASESOR");
    const dev = await createDevelopment(org.adminCtx, { name: "Pipeline Dev", city: "SLP" });
    unitId = (await createUnit(org.adminCtx, dev.id, { code: "L-1", type: "LOTE", price: 500000, status: "DISPONIBLE" })).id;
  });
  afterAll(cleanup);

  it("requires a lost reason (and a note for OTRO)", async () => {
    const { lead } = await createLeadManual(org.adminCtx, { firstName: "Perdido", phone: phone() });
    await expect(changeStage(org.adminCtx, lead.id, { stage: "PERDIDO" })).rejects.toThrow(/motivo/);
    await expect(changeStage(org.adminCtx, lead.id, { stage: "PERDIDO", lostReason: "OTRO" })).rejects.toThrow(/Describe/);
    const updated = await changeStage(org.adminCtx, lead.id, { stage: "PERDIDO", lostReason: "PRECIO" });
    expect(updated.lostReason).toBe("PRECIO");
    // reopening clears the reason
    const reopened = await changeStage(org.adminCtx, lead.id, { stage: "CONTACTADO" });
    expect(reopened.lostReason).toBeNull();
  });

  it("records stage history and marks contact", async () => {
    const { lead } = await createLeadManual(org.adminCtx, { firstName: "Historia", phone: phone() });
    expect(lead.firstContactAt).toBeNull();
    const updated = await changeStage(org.adminCtx, lead.id, { stage: "CITA_AGENDADA" });
    expect(updated.firstContactAt).not.toBeNull();
    const events = await rootPrisma.leadStageEvent.findMany({ where: { leadId: lead.id }, orderBy: { createdAt: "asc" } });
    expect(events.map((e) => e.toStage)).toEqual(["NUEVO", "CITA_AGENDADA"]);
  });

  it("syncs the unit status: apartado -> vendido, and blocks double sales", async () => {
    const { lead } = await createLeadManual(org.adminCtx, { firstName: "Comprador", phone: phone(), unitId });
    await changeStage(org.adminCtx, lead.id, { stage: "APARTADO" });
    expect((await rootPrisma.unit.findUniqueOrThrow({ where: { id: unitId } })).status).toBe("APARTADO");

    const { lead: rival } = await createLeadManual(org.adminCtx, { firstName: "Rival", phone: phone(), unitId });
    await expect(changeStage(org.adminCtx, rival.id, { stage: "APARTADO" })).rejects.toThrow(/apartada/);

    const sold = await changeStage(org.adminCtx, lead.id, { stage: "VENDIDO" });
    expect(sold.soldAt).not.toBeNull();
    expect(Number(sold.saleAmount)).toBe(500000); // defaults to unit price
    expect((await rootPrisma.unit.findUniqueOrThrow({ where: { id: unitId } })).status).toBe("VENDIDO");
    await expect(changeStage(org.adminCtx, rival.id, { stage: "VENDIDO" })).rejects.toThrow(/vendida/);
  });

  it("releases the unit when a deal falls through", async () => {
    const dev = await rootPrisma.development.findFirstOrThrow({ where: { organizationId: org.org.id } });
    const u = await createUnit(org.adminCtx, dev.id, { code: "L-2", type: "LOTE", price: 1, status: "DISPONIBLE" });
    const { lead } = await createLeadManual(org.adminCtx, { firstName: "Arrepentido", phone: phone(), unitId: u.id });
    await changeStage(org.adminCtx, lead.id, { stage: "APARTADO" });
    await changeStage(org.adminCtx, lead.id, { stage: "PERDIDO", lostReason: "FINANCIAMIENTO" });
    expect((await rootPrisma.unit.findUniqueOrThrow({ where: { id: u.id } })).status).toBe("DISPONIBLE");
  });

  it("asesor can move own leads but not others'", async () => {
    const { lead: mine } = await createLeadManual(asesor.ctx, { firstName: "Mío", phone: phone() });
    await changeStage(asesor.ctx, mine.id, { stage: "CONTACTADO" });
    const { lead: notMine } = await createLeadManual(org.adminCtx, { firstName: "Ajeno", phone: phone() });
    await expect(changeStage(asesor.ctx, notMine.id, { stage: "CONTACTADO" })).rejects.toThrow(/no encontrado/i);
  });

  it("another org cannot move the lead", async () => {
    const other = await makeOrg("Pipeline Otra");
    const { lead } = await createLeadManual(org.adminCtx, { firstName: "Protegido", phone: phone() });
    await expect(changeStage(other.adminCtx, lead.id, { stage: "VENDIDO" })).rejects.toThrow(/no encontrado/i);
  });

  it("pipeline columns only include visible leads", async () => {
    const { columns } = await getPipeline(asesor.ctx, {});
    const all = columns.flatMap((c) => c.leads);
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((l) => l.assignedToId === asesor.user.id)).toBe(true);
  });
});
