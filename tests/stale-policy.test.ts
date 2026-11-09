import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_STAGE_HOURS, isStale, staleHoursFor, stalePolicy } from "@/lib/stale";
import { getAlerts } from "@/server/services/tasks";
import { createLeadManual, listLeads } from "@/server/services/leads";
import { changeStage } from "@/server/services/pipeline";
import { createTask } from "@/server/services/tasks";
import { updateStalePolicy } from "@/server/services/organization";
import { rootPrisma } from "@/server/db/root";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

const H = 3_600_000;

describe("stale policy per stage (QA B18)", () => {
  const now = new Date("2026-11-10T12:00:00Z");
  const ago = (h: number) => new Date(now.getTime() - h * H);

  it("NUEVO uses the org base; later stages get more room by default; overrides win", () => {
    const p = stalePolicy({ staleLeadHours: 24, staleHoursByStage: {} });
    expect(staleHoursFor("NUEVO", p)).toBe(24);
    expect(staleHoursFor("CITA_AGENDADA", p)).toBe(DEFAULT_STAGE_HOURS.CITA_AGENDADA);
    expect(staleHoursFor("CITA_AGENDADA", stalePolicy({ staleLeadHours: 24, staleHoursByStage: { CITA_AGENDADA: 12 } }))).toBe(12);
    // Junk in the JSON column is ignored, not trusted.
    expect(staleHoursFor("CONTACTADO", stalePolicy({ staleLeadHours: 24, staleHoursByStage: { CONTACTADO: "x", FOO: 3 } }))).toBe(
      DEFAULT_STAGE_HOURS.CONTACTADO,
    );
  });

  it("a lead with an upcoming task or appointment is not cold", () => {
    const p = stalePolicy({ staleLeadHours: 24, staleHoursByStage: {} });
    const lead = { stage: "NUEVO" as const, lastContactAt: null, createdAt: ago(30) };
    expect(isStale(lead, p, now)).toBe(true);
    expect(isStale({ ...lead, hasUpcomingTask: true }, p, now)).toBe(false);
    // An appointment scheduled for next week does not turn red after a day.
    expect(isStale({ stage: "CITA_AGENDADA", lastContactAt: ago(100), createdAt: ago(200) }, p, now)).toBe(false);
    expect(isStale({ stage: "CONTACTADO", lastContactAt: ago(80), createdAt: ago(200) }, p, now)).toBe(true);
  });
});

describe("alerts and lists honour the policy (QA B18)", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  let asesor: Awaited<ReturnType<typeof addMember>>;
  let n = 0;
  const phone = () => `+52444970${String(++n).padStart(4, "0")}`;
  const aged = async (firstName: string, hours: number) => {
    const { lead } = await createLeadManual(asesor.ctx, { firstName, phone: phone() });
    await rootPrisma.lead.update({ where: { id: lead.id }, data: { createdAt: new Date(Date.now() - hours * H) } });
    return lead;
  };

  beforeAll(async () => {
    org = await makeOrg("Frio Org");
    asesor = await addMember(org.org.id, "ASESOR");
    await rootPrisma.organization.update({ where: { id: org.org.id }, data: { staleLeadHours: 24 } });
  });
  afterAll(cleanup);

  it("excludes leads with a future task, keeps those whose task is overdue", async () => {
    const withFuture = await aged("Con cita", 30);
    await createTask(asesor.ctx, withFuture.id, { title: "Visita", dueAt: new Date(Date.now() + 48 * H) });
    const withOverdue = await aged("Tarea vencida", 30);
    await createTask(asesor.ctx, withOverdue.id, { title: "Llamar", dueAt: new Date(Date.now() - 2 * H) });
    await aged("Olvidado", 30);
    const a = await getAlerts(asesor.ctx);
    expect(a.staleLeads).toBe(2);
    const names = (await listLeads(asesor.ctx, { staleOnly: true })).leads.map((l) => l.firstName).sort();
    expect(names).toEqual(["Olvidado", "Tarea vencida"]);
  });

  it("per-stage thresholds are configurable by the admin only", async () => {
    const lead = await aged("Contactado hace 30 h", 60);
    await changeStage(asesor.ctx, lead.id, { stage: "CONTACTADO" });
    await rootPrisma.lead.update({ where: { id: lead.id }, data: { lastContactAt: new Date(Date.now() - 30 * H) } });
    const before = (await getAlerts(asesor.ctx)).staleLeads;
    await expect(updateStalePolicy(asesor.ctx, { CONTACTADO: 24 })).rejects.toThrow(/permiso/i);
    await updateStalePolicy(org.adminCtx, { CONTACTADO: 24 });
    expect((await getAlerts(asesor.ctx)).staleLeads).toBe(before + 1);
    await expect(updateStalePolicy(org.adminCtx, { CONTACTADO: 0 })).rejects.toThrow(/hora/i);
  });

  it("the banner lists the 5 most urgent instead of only a big number", async () => {
    for (let i = 0; i < 6; i++) await aged(`Viejo ${i}`, 100 + i * 10);
    const a = await getAlerts(asesor.ctx);
    expect(a.staleLeads).toBeGreaterThan(5);
    expect(a.urgent).toHaveLength(5);
    expect(a.urgent[0].name).toBe("Viejo 5"); // the longest without contact comes first
    expect(a.urgent.every((u) => typeof u.id === "string" && u.hours > 24)).toBe(true);
  });
});
