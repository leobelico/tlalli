import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { changeStage, changeStageDetailed, undoStageChange, UNDO_WINDOW_MS } from "@/server/services/pipeline";
import { createLeadManual } from "@/server/services/leads";
import { createDevelopment, createUnit } from "@/server/services/inventory";
import { rootPrisma } from "@/server/db/root";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

describe("undoing a stage change (pilot item 7)", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  let other: Awaited<ReturnType<typeof makeOrg>>;
  let asesor: Awaited<ReturnType<typeof addMember>>;
  let asesor2: Awaited<ReturnType<typeof addMember>>;
  let devId: string;
  let n = 0;
  const phone = () => `+52444990${String(++n).padStart(4, "0")}`;
  const lead = (id: string) => rootPrisma.lead.findUniqueOrThrow({ where: { id } });
  const unit = (id: string) => rootPrisma.unit.findUniqueOrThrow({ where: { id } });
  const mkUnit = async (code: string) =>
    (await createUnit(org.adminCtx, devId, { code, type: "LOTE", price: 400000, status: "DISPONIBLE" })).id;

  beforeAll(async () => {
    org = await makeOrg("Deshacer Org");
    other = await makeOrg("Deshacer Otra");
    asesor = await addMember(org.org.id, "ASESOR");
    asesor2 = await addMember(org.org.id, "ASESOR");
    devId = (await createDevelopment(org.adminCtx, { name: "Dev Undo", city: "SLP" })).id;
  });
  afterAll(cleanup);

  it("changeStage keeps returning the lead; the detailed version also gives the event id", async () => {
    const { lead: l } = await createLeadManual(asesor.ctx, { firstName: "Compat", phone: phone() });
    expect((await changeStage(asesor.ctx, l.id, { stage: "CONTACTADO" })).stage).toBe("CONTACTADO");
    const r = await changeStageDetailed(asesor.ctx, l.id, { stage: "CITA_AGENDADA" });
    expect(r.lead.stage).toBe("CITA_AGENDADA");
    expect(r.eventId).toMatch(/^[0-9a-f-]{36}$/);
    expect((await changeStageDetailed(asesor.ctx, l.id, { stage: "CITA_AGENDADA" })).eventId).toBeNull(); // no change, nothing to undo
  });

  it("restores the stage and the contact timestamps the move had touched", async () => {
    const { lead: l } = await createLeadManual(asesor.ctx, { firstName: "Contacto", phone: phone() });
    const before = await lead(l.id);
    expect(before.lastContactAt).toBeNull();
    const { eventId } = await changeStageDetailed(asesor.ctx, l.id, { stage: "CITA_AGENDADA" });
    expect((await lead(l.id)).lastContactAt).not.toBeNull(); // advancing implies contact
    await undoStageChange(asesor.ctx, eventId!);
    const after = await lead(l.id);
    expect(after.stage).toBe("NUEVO");
    expect(after.lastContactAt).toBeNull();
    expect(after.firstContactAt).toBeNull();
    expect(after.stageChangedAt.getTime()).toBe(before.stageChangedAt.getTime());
    expect(await rootPrisma.activity.count({ where: { leadId: l.id, body: { contains: "deshizo" } } })).toBe(1);
    expect((await rootPrisma.leadStageEvent.findUniqueOrThrow({ where: { id: eventId! } })).undoneAt).not.toBeNull();
  });

  it("gives the unit back when undoing an apartado or a sale", async () => {
    const unitId = await mkUnit("U-1");
    const { lead: l } = await createLeadManual(org.adminCtx, { firstName: "Apartado", phone: phone(), unitId });
    const ap = await changeStageDetailed(org.adminCtx, l.id, { stage: "APARTADO" });
    expect((await unit(unitId)).status).toBe("APARTADO");
    await undoStageChange(org.adminCtx, ap.eventId!);
    expect((await unit(unitId)).status).toBe("DISPONIBLE");
    expect((await lead(l.id)).stage).toBe("NUEVO");

    await changeStage(org.adminCtx, l.id, { stage: "APARTADO" });
    const sale = await changeStageDetailed(org.adminCtx, l.id, { stage: "VENDIDO", saleAmount: 390000 });
    expect((await unit(unitId)).status).toBe("VENDIDO");
    await undoStageChange(org.adminCtx, sale.eventId!);
    const back = await lead(l.id);
    expect(back).toMatchObject({ stage: "APARTADO", soldAt: null, saleAmount: null });
    expect((await unit(unitId)).status).toBe("APARTADO");
  });

  it("restores the lost reason, in both directions", async () => {
    const { lead: l } = await createLeadManual(asesor.ctx, { firstName: "Perdido", phone: phone() });
    const lost = await changeStageDetailed(asesor.ctx, l.id, { stage: "PERDIDO", lostReason: "PRECIO", lostNote: "caro" });
    await undoStageChange(asesor.ctx, lost.eventId!);
    expect(await lead(l.id)).toMatchObject({ stage: "NUEVO", lostReason: null, lostNote: null });

    await changeStage(asesor.ctx, l.id, { stage: "PERDIDO", lostReason: "UBICACION" });
    const reopen = await changeStageDetailed(asesor.ctx, l.id, { stage: "CONTACTADO" });
    expect((await lead(l.id)).lostReason).toBeNull();
    await undoStageChange(asesor.ctx, reopen.eventId!);
    expect(await lead(l.id)).toMatchObject({ stage: "PERDIDO", lostReason: "UBICACION" });
  });

  it("only works once, only for the latest change, and only inside the time window", async () => {
    const { lead: l } = await createLeadManual(asesor.ctx, { firstName: "Reglas", phone: phone() });
    const first = await changeStageDetailed(asesor.ctx, l.id, { stage: "CONTACTADO" });
    await undoStageChange(asesor.ctx, first.eventId!);
    await expect(undoStageChange(asesor.ctx, first.eventId!)).rejects.toThrow(/ya se deshizo/i);

    const a = await changeStageDetailed(asesor.ctx, l.id, { stage: "CONTACTADO" });
    await changeStageDetailed(asesor.ctx, l.id, { stage: "CITA_AGENDADA" });
    await expect(undoStageChange(asesor.ctx, a.eventId!)).rejects.toThrow(/otro cambio/i);

    const old = await changeStageDetailed(asesor.ctx, l.id, { stage: "VISITA_REALIZADA" });
    await rootPrisma.leadStageEvent.update({ where: { id: old.eventId! }, data: { createdAt: new Date(Date.now() - UNDO_WINDOW_MS - 5_000) } });
    await expect(undoStageChange(asesor.ctx, old.eventId!)).rejects.toThrow(/tiempo/i);
    expect((await lead(l.id)).stage).toBe("VISITA_REALIZADA");
  });

  it("only the person who made the change can undo it; other asesores and organizations cannot see it", async () => {
    const { lead: l } = await createLeadManual(asesor.ctx, { firstName: "Mío", phone: phone() });
    const ev = await changeStageDetailed(asesor.ctx, l.id, { stage: "CONTACTADO" });
    await expect(undoStageChange(asesor2.ctx, ev.eventId!)).rejects.toThrow(/no encontrad/i);
    await expect(undoStageChange(other.adminCtx, ev.eventId!)).rejects.toThrow(/no encontrad/i);
    await expect(undoStageChange(org.adminCtx, ev.eventId!)).rejects.toThrow(/quien lo hizo/i);
    expect((await lead(l.id)).stage).toBe("CONTACTADO");
    await undoStageChange(asesor.ctx, ev.eventId!);
  });

  it("does not touch a unit someone else changed in the meantime", async () => {
    const unitId = await mkUnit("U-2");
    const { lead: l } = await createLeadManual(org.adminCtx, { firstName: "Carrera", phone: phone(), unitId });
    const ap = await changeStageDetailed(org.adminCtx, l.id, { stage: "APARTADO" });
    await rootPrisma.unit.update({ where: { id: unitId }, data: { status: "VENDIDO" } }); // changed by hand meanwhile
    await undoStageChange(org.adminCtx, ap.eventId!);
    expect((await lead(l.id)).stage).toBe("NUEVO");
    expect((await unit(unitId)).status).toBe("VENDIDO"); // left as the other change put it
  });
});
