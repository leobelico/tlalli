import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { calculateQuote } from "@/lib/quote";
import { DEFAULT_QUOTE_POLICY, equivalentDiscount, policyReasons } from "@/lib/policy";
import { AuthorizationPendingError } from "@/server/errors";
import { createQuote } from "@/server/services/quotes";
import { createDevelopment, createUnit } from "@/server/services/inventory";
import { updateOrganizationSettings } from "@/server/services/organization";
import { decideAuthorization } from "@/server/services/authorizations";
import { rootPrisma } from "@/server/db/root";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

const quote = (o: { price?: number; discount?: number; down?: number; months?: number; rate?: number }) =>
  calculateQuote({ price: o.price ?? 500_000, discount: o.discount ?? 0, downPaymentPct: o.down ?? 20, months: o.months ?? 24, annualRatePct: o.rate ?? 0 });

describe("equivalent discount (QA2 B32): list price minus the present value of what the client pays", () => {
  it("equals the explicit discount when the client pays interest at the reference rate", () => {
    const calc = quote({ discount: 25_000, rate: 6, months: 36 });
    expect(equivalentDiscount(calc, 6)).toBeCloseTo(25_000, -1); // within a few pesos of rounding
  });

  it("is zero for cash (100% down) and equals the explicit discount when there is no financing", () => {
    expect(equivalentDiscount(quote({ down: 100, months: 0 }), 10)).toBeCloseTo(0, 2);
    expect(equivalentDiscount(quote({ discount: 10_000, down: 100, months: 0 }), 10)).toBeCloseTo(10_000, 2);
  });

  it("values interest-free installments as a discount (the hole: 360 months, no down payment, 0%)", () => {
    const calc = quote({ price: 544_000, down: 0, months: 360, rate: 0 });
    const eq = equivalentDiscount(calc, 10);
    expect(eq / 544_000).toBeGreaterThan(0.65); // ≈ 68% at a 10% reference rate
    expect(eq / 544_000).toBeLessThan(0.7);
  });

  it("a higher reference rate makes free financing worth more; a rate of 0 switches the effect off", () => {
    const calc = quote({ months: 48 });
    expect(equivalentDiscount(calc, 12)).toBeGreaterThan(equivalentDiscount(calc, 4));
    expect(equivalentDiscount(calc, 0)).toBeCloseTo(0, 2);
  });
});

describe("policyReasons", () => {
  it("lists every way a quote is outside what an asesor may give", () => {
    const p = { ...DEFAULT_QUOTE_POLICY, capPct: 5, referenceRatePct: 6, minDownPct: 10, minRatePct: 0, maxMonths: 120 };
    expect(policyReasons(quote({ down: 0, months: 360 }), p).map((r) => r.code).sort()).toEqual(["DESCUENTO", "ENGANCHE", "PLAZO"]);
    expect(policyReasons(quote({ down: 20, months: 24 }), p)).toEqual([]); // the form's default quote passes
    expect(policyReasons(quote({ down: 20, months: 36, rate: 2 }), { ...p, minRatePct: 5 }).map((r) => r.code)).toContain("TASA");
    expect(policyReasons(quote({ down: 100, months: 0, rate: 0 }), { ...p, minRatePct: 5 })).toEqual([]); // cash has no rate to check
  });

  it("an explicit discount above the cap always counts, even if a high rate makes its present value small", () => {
    const p = { ...DEFAULT_QUOTE_POLICY, capPct: 5, referenceRatePct: 6, minDownPct: 0, minRatePct: 0, maxMonths: 360 };
    const calc = quote({ discount: 40_000, rate: 24, months: 60 }); // 8% off but financed at 24%
    expect(policyReasons(calc, p).map((r) => r.code)).toContain("DESCUENTO");
  });
});

describe("quotes by asesores respect the equivalent discount and the minimums", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  let asesor: Awaited<ReturnType<typeof addMember>>;
  let devId: string;
  let c = 0;
  const mkUnit = async (price = 544_000) => (await createUnit(org.adminCtx, devId, { code: `P-${++c}`, type: "LOTE", price, status: "DISPONIBLE" })).id;
  const settings = (extra: Record<string, number> = {}) =>
    updateOrganizationSettings(org.adminCtx, { name: "Política Org", staleLeadHours: 24, maxAsesorDiscountPct: 5, ...extra });

  beforeAll(async () => {
    org = await makeOrg("Política Org");
    asesor = await addMember(org.org.id, "ASESOR");
    devId = (await createDevelopment(org.adminCtx, { name: "Dev Política", city: "SLP" })).id;
  });
  beforeEach(async () => {
    await settings({ referenceRatePct: 4, asesorMinDownPct: 10, asesorMinRatePct: 0, asesorMaxMonths: 120 });
  });
  afterAll(cleanup);

  it("defaults: reference 4%, minimum down 10%, no minimum rate, 120 months", async () => {
    const o = await rootPrisma.organization.findUniqueOrThrow({ where: { id: (await makeOrg("Defaults")).org.id } });
    expect(o).toMatchObject({ referenceRatePct: 4, asesorMinDownPct: 10, asesorMinRatePct: 0, asesorMaxMonths: 120 });
  });

  it("the standard quote (20% down, 24 months, no interest, no discount) needs no authorization", async () => {
    const unitId = await mkUnit();
    await expect(createQuote(asesor.ctx, { unitId, downPaymentPct: 20, months: 24, annualRatePct: 0 })).resolves.toBeTruthy();
  });

  it("360 months with nothing down and no interest becomes a request, not a quote", async () => {
    const unitId = await mkUnit();
    const err = await createQuote(asesor.ctx, { unitId, downPaymentPct: 0, months: 360, annualRatePct: 0 }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthorizationPendingError);
    expect(err.message).toMatch(/enganche/i);
    expect(err.message).toMatch(/plazo/i);
    expect(await rootPrisma.quote.count({ where: { unitId } })).toBe(0);
    const req = await rootPrisma.authorizationRequest.findFirstOrThrow({ where: { unitId, status: "PENDIENTE" } });
    expect(req.summary).toMatch(/descuento equivalente/i);
    // the admin can still approve it, and it is then authored by the asesor
    await decideAuthorization(org.adminCtx, req.id, { approve: true });
    const q = await rootPrisma.quote.findFirstOrThrow({ where: { unitId } });
    expect(q.createdById).toBe(asesor.user.id);
  });

  it("each minimum is enforced on its own and is configurable", async () => {
    const unitId = await mkUnit();
    await expect(createQuote(asesor.ctx, { unitId, downPaymentPct: 5, months: 12, annualRatePct: 0 })).rejects.toThrow(/enganche/i);
    await expect(createQuote(asesor.ctx, { unitId, downPaymentPct: 20, months: 121, annualRatePct: 12 })).rejects.toThrow(/plazo/i);
    await settings({ asesorMinRatePct: 8 });
    await expect(createQuote(asesor.ctx, { unitId, downPaymentPct: 20, months: 12, annualRatePct: 3 })).rejects.toThrow(/tasa/i);
    await expect(createQuote(asesor.ctx, { unitId, downPaymentPct: 20, months: 12, annualRatePct: 8 })).resolves.toBeTruthy();
    await settings({ asesorMinDownPct: 0, asesorMinRatePct: 0, asesorMaxMonths: 360, referenceRatePct: 0 }); // an organization can switch the guard rails off
    await expect(createQuote(asesor.ctx, { unitId, downPaymentPct: 0, months: 360, annualRatePct: 0 })).resolves.toBeTruthy();
  });

  it("administrators are not limited", async () => {
    const unitId = await mkUnit();
    await expect(createQuote(org.adminCtx, { unitId, downPaymentPct: 0, months: 360, annualRatePct: 0 })).resolves.toBeTruthy();
  });

  it("settings are validated", async () => {
    await expect(settings({ referenceRatePct: 61 })).rejects.toThrow(/referencia/i);
    await expect(settings({ asesorMinDownPct: 101 })).rejects.toThrow(/enganche/i);
    await expect(settings({ asesorMinRatePct: -1 })).rejects.toThrow(/tasa/i);
    await expect(settings({ asesorMaxMonths: 0 })).rejects.toThrow(/plazo/i);
    await expect(settings({ asesorMaxMonths: 361 })).rejects.toThrow(/plazo/i);
  });
});
