import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { developmentSchema, unitSchema } from "@/lib/validation/inventory";
import { leadFieldsSchema } from "@/lib/validation/leads";
import { ErrorView, NotFoundView } from "@/components/error-views";
import { createLeadManual } from "@/server/services/leads";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

const messages = (r: { success: boolean; error?: { issues: { message: string }[] } }) => r.error?.issues.map((i) => i.message) ?? [];

describe("validation messages are Spanish (QA B11)", () => {
  it("too-long strings say 'Máximo N caracteres' instead of Zod's English", () => {
    const lead = leadFieldsSchema.safeParse({ firstName: "Ñ".repeat(200), phone: "4448120003", notes: "x".repeat(5000) });
    expect(messages(lead)).toEqual(expect.arrayContaining(["Máximo 80 caracteres.", "Máximo 2000 caracteres."]));
    expect(messages(unitSchema.safeParse({ code: "L".repeat(60), type: "LOTE", price: 1 }))).toContain("Máximo 40 caracteres.");
    expect(messages(developmentSchema.safeParse({ name: "Dev", city: "C".repeat(100) }))).toContain("Máximo 80 caracteres.");
  });

  it("no schema message leaks English", () => {
    const all = [
      ...messages(leadFieldsSchema.safeParse({})),
      ...messages(unitSchema.safeParse({})),
      ...messages(developmentSchema.safeParse({ name: 5, city: null })),
    ];
    expect(all.length).toBeGreaterThan(0);
    for (const m of all) expect(m).not.toMatch(/\b(Too|expected|Invalid|received|string|number|Required)\b/);
  });
});

describe("error and 404 screens are Spanish (QA B12)", () => {
  it("404", () => {
    const html = renderToStaticMarkup(createElement(NotFoundView, { homeHref: "/app", homeLabel: "Ir al inicio" }));
    expect(html).toMatch(/No encontramos/i);
    expect(html).not.toMatch(/could not|not be found/i);
    expect(html).toContain('href="/app"');
  });
  it("runtime error", () => {
    const html = renderToStaticMarkup(createElement(ErrorView, { retry: () => {} }));
    expect(html).toMatch(/Algo salió mal/i);
    expect(html).toMatch(/Reintentar/);
    expect(html).not.toMatch(/went wrong|couldn.t load|try again/i);
  });
});

describe("asesor capturing a phone that another asesor already handles (QA B10)", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  let a1: Awaited<ReturnType<typeof addMember>>;
  let a2: Awaited<ReturnType<typeof addMember>>;
  beforeAll(async () => {
    org = await makeOrg("B10 Org");
    a1 = await addMember(org.org.id, "ASESOR");
    a2 = await addMember(org.org.id, "ASESOR");
  });
  afterAll(cleanup);

  it("reports that the lead is not accessible instead of pointing at a page that 404s", async () => {
    const first = await createLeadManual(a1.ctx, { firstName: "De Uno", phone: "+524449200001" });
    expect(first.accessible).toBe(true);
    const dup = await createLeadManual(a2.ctx, { firstName: "Quiero", phone: "+524449200001" });
    expect(dup.created).toBe(false);
    expect(dup.accessible).toBe(false);
    const mine = await createLeadManual(a1.ctx, { firstName: "De Uno otra vez", phone: "+524449200001" });
    expect(mine.accessible).toBe(true);
    const admin = await createLeadManual(org.adminCtx, { firstName: "Admin", phone: "+524449200001" });
    expect(admin.accessible).toBe(true);
  });
});
