import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getOnboarding } from "@/server/services/onboarding";
import { createDevelopment } from "@/server/services/inventory";
import { createLeadManual } from "@/server/services/leads";
import { updateOrganizationSettings } from "@/server/services/organization";
import { createInvitation } from "@/server/auth/invitations";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

/** QA2 B38: a new organization sees what to do first, with progress, and it goes away when done. */
describe("first-day guide (QA2 B38)", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  let other: Awaited<ReturnType<typeof makeOrg>>;
  beforeAll(async () => {
    org = await makeOrg("Primer Día Org");
    other = await makeOrg("Primer Día Otra");
  });
  afterAll(cleanup);

  const state = async (o = org) => {
    const g = await getOnboarding(o.adminCtx);
    return g && { done: g.steps.filter((s) => s.done).map((s) => s.key), total: g.steps.length, complete: g.complete };
  };

  it("starts with the four steps, none done", async () => {
    const g = (await getOnboarding(org.adminCtx))!;
    expect(g.steps.map((s) => s.key)).toEqual(["desarrollo", "leads", "asesores", "tope"]);
    expect(g.steps.map((s) => s.title)).toEqual(["Crea tu primer desarrollo", "Importa tus leads", "Invita a tus asesores", "Define tu tope de descuento"]);
    expect(g.steps.every((s) => s.href.startsWith("/app/"))).toBe(true);
    expect(await state()).toEqual({ done: [], total: 4, complete: false });
  });

  it("each step is marked as the real thing happens", async () => {
    await createDevelopment(org.adminCtx, { name: "Primer desarrollo", city: "SLP" });
    expect((await state())!.done).toEqual(["desarrollo"]);
    await createLeadManual(org.adminCtx, { firstName: "Primero", phone: "+524449990001" });
    expect((await state())!.done).toEqual(["desarrollo", "leads"]);
    await createInvitation(org.adminCtx, { email: `asesor-${Date.now()}@ejemplo.test`, role: "ASESOR" });
    expect((await state())!.done).toEqual(["desarrollo", "leads", "asesores"]);
    expect((await state())!.complete).toBe(false);
    await updateOrganizationSettings(org.adminCtx, { name: "Primer Día Org", staleLeadHours: 24, maxAsesorDiscountPct: 5 });
    expect(await state()).toEqual({ done: ["desarrollo", "leads", "asesores", "tope"], total: 4, complete: true });
  });

  it("saving only the name and alert hours does not count as defining the cap", async () => {
    await updateOrganizationSettings(other.adminCtx, { name: "Primer Día Otra", staleLeadHours: 48 });
    expect((await state(other))!.done).not.toContain("tope");
  });

  it("an accepted member also counts as inviting, and other organizations are independent", async () => {
    await addMember(other.org.id, "ASESOR");
    expect((await state(other))!.done).toContain("asesores");
    expect((await state(other))!.done).not.toContain("desarrollo");
  });

  it("asesores never see it", async () => {
    const asesor = await addMember(org.org.id, "ASESOR");
    expect(await getOnboarding(asesor.ctx)).toBeNull();
  });
});
