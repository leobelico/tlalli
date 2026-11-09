import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDashboard, parseRange } from "@/server/services/dashboard";
import { createCampaign } from "@/server/services/campaigns";
import { createLeadManual } from "@/server/services/leads";
import { changeStage } from "@/server/services/pipeline";
import { rootPrisma } from "@/server/db/root";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

const H = 3_600_000;
const wide = { from: new Date(Date.now() - 30 * 86_400_000), to: new Date(Date.now() + 86_400_000) };

describe("parseRange", () => {
  it("defaults to the last 30 days", () => {
    const now = new Date("2026-11-05T18:00:00Z");
    const r = parseRange(undefined, undefined, now);
    expect(Math.round((r.to.getTime() - r.from.getTime()) / 86_400_000)).toBe(30);
  });
  it("interprets dates in Mexico City time and includes the end day", () => {
    const r = parseRange("2026-10-01", "2026-10-31", new Date("2026-11-05T00:00:00Z"));
    expect(r.from.toISOString()).toBe("2026-10-01T06:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-11-01T06:00:00.000Z");
  });
  it("ignores garbage and fixes inverted ranges", () => {
    const now = new Date("2026-11-05T18:00:00Z");
    expect(parseRange("hola", "x", now).from < now).toBe(true);
    const r = parseRange("2026-12-01", "2026-01-01", now);
    expect(r.from < r.to).toBe(true);
  });
});

describe("dashboard metrics", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  let ana: Awaited<ReturnType<typeof addMember>>;
  let beto: Awaited<ReturnType<typeof addMember>>;
  let other: Awaited<ReturnType<typeof makeOrg>>;
  let n = 0;
  const phone = () => `+52444900${String(++n).padStart(4, "0")}`;

  beforeAll(async () => {
    org = await makeOrg("Dashboard Org");
    other = await makeOrg("Dashboard Otra");
    ana = await addMember(org.org.id, "ASESOR");
    beto = await addMember(org.org.id, "ASESOR");
    const radio = await createCampaign(org.adminCtx, { name: "Radio", channel: "RADIO", code: "RAD-1", spend: 10000 });
    const fb = await createCampaign(org.adminCtx, { name: "Facebook", channel: "FACEBOOK", code: "FB-1", spend: 3000 });

    // Radio: 4 leads (Ana). One sold, one contacted after 2 h, one lost.
    const mk = async (ctx: typeof ana.ctx, campaignId?: string) =>
      (await createLeadManual(ctx, { firstName: "L", phone: phone(), campaignId })).lead;
    const r1 = await mk(ana.ctx, radio.id);
    const r2 = await mk(ana.ctx, radio.id);
    const r3 = await mk(ana.ctx, radio.id);
    await mk(ana.ctx, radio.id);
    // Facebook: 2 leads (Beto)
    const f1 = await mk(beto.ctx, fb.id);
    await mk(beto.ctx, fb.id);
    // Without campaign
    await createLeadManual(beto.ctx, { firstName: "Sin", phone: phone() });

    const created = new Date(Date.now() - 10 * H);
    await rootPrisma.lead.updateMany({ where: { organizationId: org.org.id }, data: { createdAt: created } });
    await rootPrisma.lead.update({ where: { id: r2.id }, data: { firstContactAt: new Date(created.getTime() + 2 * H), stage: "CONTACTADO" } });
    await rootPrisma.leadStageEvent.create({ data: { organizationId: org.org.id, leadId: r2.id, fromStage: "NUEVO", toStage: "CONTACTADO" } });

    await changeStage(ana.ctx, r1.id, { stage: "CITA_AGENDADA" });
    // Sales without a linked unit need an admin (QA B04); the dashboard credits the assigned asesor.
    await changeStage(org.adminCtx, r1.id, { stage: "VENDIDO", saleAmount: 500000 }); // skips steps
    await changeStage(ana.ctx, r3.id, { stage: "PERDIDO", lostReason: "PRECIO" });
    await changeStage(beto.ctx, f1.id, { stage: "COTIZACION" });
  });
  afterAll(cleanup);

  it("totals, conversion and sales amount", async () => {
    const d = await getDashboard(org.adminCtx, wide);
    expect(d.totals).toMatchObject({ leads: 7, sold: 1, lost: 1, salesAmount: 500000 });
    expect(d.totals.conversionPct).toBeCloseTo((1 / 7) * 100, 5);
  });

  it("leads by campaign with cost per lead and per sale (admin only)", async () => {
    const d = await getDashboard(org.adminCtx, wide);
    const radio = d.campaigns.find((c) => c.code === "RAD-1")!;
    expect(radio).toMatchObject({ leads: 4, sold: 1, spend: 10000, costPerLead: 2500, costPerSale: 10000 });
    expect(d.campaigns.find((c) => c.code === "FB-1")).toMatchObject({ leads: 2, costPerLead: 1500, costPerSale: null });
    expect(d.campaigns.find((c) => c.label === "Sin campaña")?.leads).toBe(1);
    expect(d.campaigns[0].code).toBe("RAD-1"); // sorted by volume

    const mine = await getDashboard(ana.ctx, wide);
    expect(mine.scope).toBe("mine");
    expect(mine.campaigns.every((c) => c.spend === null && c.costPerLead === null)).toBe(true);
  });

  it("funnel counts leads that passed each step, including skipped ones", async () => {
    const { funnel } = await getDashboard(org.adminCtx, wide);
    const reached = Object.fromEntries(funnel.map((f) => [f.stage, f.reached]));
    expect(reached.NUEVO).toBe(7);
    expect(reached.CONTACTADO).toBe(3); // r1 (cita→vendido), r2, f1 (cotización)
    expect(reached.CITA_AGENDADA).toBe(2); // r1 + f1 passed it
    expect(reached.COTIZACION).toBe(2);
    expect(reached.VENDIDO).toBe(1);
    expect(funnel[0].pctOfLeads).toBe(100);
    expect(funnel.find((f) => f.stage === "VENDIDO")!.pctOfPrevious).not.toBeNull();
  });

  it("first response time", async () => {
    const d = await getDashboard(org.adminCtx, wide);
    expect(d.firstResponse.contacted).toBe(3); // r1, r2, f1 (marking a lead lost is not a contact)
    expect(d.firstResponse.waiting).toBe(4);
    const ana2 = d.agents.find((a) => a.name === "Asesor Prueba" && a.avgFirstResponseHours !== null);
    expect(ana2).toBeDefined();
    expect(d.firstResponse.medianHours).not.toBeNull();
  });

  it("sales per agent", async () => {
    const d = await getDashboard(org.adminCtx, wide);
    const sellers = d.agents.filter((a) => a.sales > 0);
    expect(sellers).toHaveLength(1);
    expect(sellers[0]).toMatchObject({ userId: ana.user.id, sales: 1, salesAmount: 500000, leads: 4 });
    expect(d.agents[0].userId).toBe(ana.user.id);
  });

  it("asesor only sees own cohort; other org sees nothing", async () => {
    const mine = await getDashboard(beto.ctx, wide);
    expect(mine.totals.leads).toBe(3);
    expect(mine.agents.every((a) => a.userId === beto.user.id)).toBe(true);
    const none = await getDashboard(other.adminCtx, wide);
    expect(none.totals.leads).toBe(0);
    expect(none.campaigns).toEqual([]);
  });

  it("date range filters the cohort", async () => {
    const old = { from: new Date(Date.now() - 90 * 86_400_000), to: new Date(Date.now() - 60 * 86_400_000) };
    expect((await getDashboard(org.adminCtx, old)).totals.leads).toBe(0);
  });
});
