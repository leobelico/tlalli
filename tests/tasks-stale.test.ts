import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTask, deleteTask, getAlerts, listTasks, setTaskDone } from "@/server/services/tasks";
import { addActivity, createLeadManual, listLeads } from "@/server/services/leads";
import { rootPrisma } from "@/server/db/root";
import { hoursWithoutContact, isStale } from "@/lib/stale";
import { parseMxDateTimeLocal } from "@/lib/format";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

const H = 3_600_000;

describe("stale lead rule (pure)", () => {
  const now = new Date("2026-11-05T18:00:00Z");
  it("uses creation time when never contacted", () => {
    const lead = { stage: "NUEVO" as const, lastContactAt: null, createdAt: new Date(now.getTime() - 25 * H) };
    expect(hoursWithoutContact(lead, now)).toBeCloseTo(25);
    expect(isStale(lead, 24, now)).toBe(true);
    expect(isStale(lead, 48, now)).toBe(false);
  });
  it("uses the last contact when present", () => {
    const lead = {
      stage: "COTIZACION" as const,
      lastContactAt: new Date(now.getTime() - 2 * H),
      createdAt: new Date(now.getTime() - 100 * H),
    };
    expect(isStale(lead, 24, now)).toBe(false);
  });
  it("never flags closed stages", () => {
    for (const stage of ["APARTADO", "VENDIDO", "PERDIDO"] as const) {
      expect(isStale({ stage, lastContactAt: null, createdAt: new Date(0) }, 1, now)).toBe(false);
    }
  });
  it("parses datetime-local as Mexico City time", () => {
    expect(parseMxDateTimeLocal("2026-11-05T10:00")?.toISOString()).toBe("2026-11-05T16:00:00.000Z");
    expect(parseMxDateTimeLocal("mañana")).toBeNull();
  });
});

describe("tasks and alerts", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  let asesor: Awaited<ReturnType<typeof addMember>>;
  let other: Awaited<ReturnType<typeof addMember>>;
  let myLead: { id: string };
  let othersLead: { id: string };

  beforeAll(async () => {
    org = await makeOrg("Tareas Org");
    await rootPrisma.organization.update({ where: { id: org.org.id }, data: { staleLeadHours: 24 } });
    asesor = await addMember(org.org.id, "ASESOR");
    other = await addMember(org.org.id, "ASESOR");
    myLead = (await createLeadManual(asesor.ctx, { firstName: "Mío", phone: "+524447000001" })).lead;
    othersLead = (await createLeadManual(other.ctx, { firstName: "Ajeno", phone: "+524447000002" })).lead;
  });
  afterAll(cleanup);

  it("asesor creates tasks for own leads only, assigned to self", async () => {
    const t = await createTask(asesor.ctx, myLead.id, { title: "Llamar", dueAt: new Date(Date.now() - H) });
    expect(t.assignedToId).toBe(asesor.user.id);
    await expect(createTask(asesor.ctx, othersLead.id, { title: "x", dueAt: new Date() })).rejects.toThrow(/no encontrado/i);
    await expect(
      createTask(asesor.ctx, myLead.id, { title: "x", dueAt: new Date(), assignedToId: other.user.id }),
    ).rejects.toThrow(/para ti/);
  });

  it("admin can assign tasks to any active member", async () => {
    const t = await createTask(org.adminCtx, othersLead.id, { title: "Seguimiento", dueAt: new Date(Date.now() + 2 * H) });
    expect(t.assignedToId).toBe(other.user.id); // defaults to the lead owner
  });

  it("alerts count overdue tasks and stale leads; contact clears the stale flag", async () => {
    await rootPrisma.lead.update({ where: { id: myLead.id }, data: { createdAt: new Date(Date.now() - 30 * H) } });
    let alerts = await getAlerts(asesor.ctx);
    expect(alerts.overdueTasks).toBe(1);
    expect(alerts.staleLeads).toBe(1);
    expect((await listLeads(asesor.ctx, { staleOnly: true })).total).toBe(1);

    await addActivity(asesor.ctx, myLead.id, "NOTA", "Una nota no cuenta como contacto");
    expect((await getAlerts(asesor.ctx)).staleLeads).toBe(1);
    await addActivity(asesor.ctx, myLead.id, "LLAMADA", "Le marqué");
    alerts = await getAlerts(asesor.ctx);
    expect(alerts.staleLeads).toBe(0);
    const lead = await rootPrisma.lead.findUniqueOrThrow({ where: { id: myLead.id } });
    expect(lead.stage).toBe("CONTACTADO");
    expect(lead.firstContactAt).not.toBeNull();
  });

  it("threshold is configurable per organization", async () => {
    await rootPrisma.lead.update({
      where: { id: myLead.id },
      data: { lastContactAt: new Date(Date.now() - 5 * H) },
    });
    expect((await getAlerts(asesor.ctx)).staleLeads).toBe(0);
    await rootPrisma.organization.update({ where: { id: org.org.id }, data: { staleLeadHours: 4 } });
    expect((await getAlerts(asesor.ctx)).staleLeads).toBe(1);
  });

  it("completing, listing and deleting tasks respects ownership", async () => {
    const { tasks } = await listTasks(asesor.ctx, { scope: "all" });
    expect(tasks.every((t) => t.assignedToId === asesor.user.id)).toBe(true);
    const mine = tasks[0];
    await setTaskDone(asesor.ctx, mine.id, true);
    expect((await getAlerts(asesor.ctx)).overdueTasks).toBe(0);

    const othersTask = await rootPrisma.task.findFirstOrThrow({ where: { assignedToId: other.user.id } });
    await expect(setTaskDone(asesor.ctx, othersTask.id, true)).rejects.toThrow(/no encontrada/i);
    await expect(deleteTask(asesor.ctx, othersTask.id)).rejects.toThrow(/no encontrada/i);
    // admin sees all
    expect((await listTasks(org.adminCtx, { scope: "all", includeDone: true })).tasks.length).toBe(2);
    expect((await listTasks(org.adminCtx, { scope: "all" })).tasks.length).toBe(1);
  });
});
