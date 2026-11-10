import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseShape, shapeArea, sniffImageType } from "@/lib/plan-shape";
import { bulkCreateUnits, createDevelopment, getDevelopment } from "@/server/services/inventory";
import { deletePlan, getPlanFile, hasPlan, listPlanUnits, savePlan, setUnitShape } from "@/server/services/plans";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

// Smallest valid-looking headers; the service only checks magic bytes.
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const WEBP = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]);
const SVG = new Uint8Array(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'));
const SQUARE: [number, number][] = [
  [0.1, 0.1],
  [0.3, 0.1],
  [0.3, 0.3],
  [0.1, 0.3],
];

describe("image sniffing and shapes", () => {
  it("recognizes PNG/JPEG/WebP and rejects SVG, HTML and PDF", () => {
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
    expect(sniffImageType(WEBP)).toBe("image/webp");
    expect(sniffImageType(SVG)).toBeNull();
    expect(sniffImageType(new Uint8Array(Buffer.from("<html><script>")))).toBeNull();
    expect(sniffImageType(new Uint8Array(Buffer.from("%PDF-1.7")))).toBeNull();
  });

  it("validates shapes defensively", () => {
    expect(parseShape(SQUARE)).toEqual(SQUARE);
    expect(parseShape([[0, 0]])).toBeNull();
    expect(parseShape([[0, 0], [1, 0], [2, 1]])).toBeNull(); // out of range
    expect(parseShape("nope")).toBeNull();
    expect(shapeArea(SQUARE)).toBeCloseTo(0.04, 5);
  });
});

describe("development plans", () => {
  let a: Awaited<ReturnType<typeof makeOrg>>;
  let b: Awaited<ReturnType<typeof makeOrg>>;
  let devA: { id: string };
  let devB: { id: string };
  let unitA: string;
  let unitB: string;

  beforeAll(async () => {
    a = await makeOrg("Plan A");
    b = await makeOrg("Plan B");
    devA = await createDevelopment(a.adminCtx, { name: "Los Pinos", city: "SLP" });
    devB = await createDevelopment(b.adminCtx, { name: "Lomas", city: "SLP" });
    await bulkCreateUnits(a.adminCtx, devA.id, { prefix: "Lote ", from: 1, to: 3, type: "LOTE", price: 100000 });
    await bulkCreateUnits(b.adminCtx, devB.id, { prefix: "Lote ", from: 1, to: 3, type: "LOTE", price: 100000 });
    unitA = (await getDevelopment(a.adminCtx, devA.id)).units[0].id;
    unitB = (await getDevelopment(b.adminCtx, devB.id)).units[0].id;
  });
  afterAll(cleanup);

  it("requires a plan before outlining lots", async () => {
    await expect(setUnitShape(a.adminCtx, devA.id, unitA, SQUARE)).rejects.toThrow(/Sube primero el plano/);
  });

  it("admin uploads, outlines and reads back", async () => {
    await savePlan(a.adminCtx, devA.id, PNG);
    expect(await hasPlan(a.adminCtx, devA.id)).not.toBeNull();
    expect((await getPlanFile(a.adminCtx, devA.id)).contentType).toBe("image/png");
    await setUnitShape(a.adminCtx, devA.id, unitA, SQUARE);
    const units = await listPlanUnits(a.adminCtx, devA.id);
    expect(units.find((u) => u.id === unitA)?.shape).toEqual(SQUARE);
    expect(units.filter((u) => u.shape).length).toBe(1);
    await setUnitShape(a.adminCtx, devA.id, unitA, null);
    expect((await listPlanUnits(a.adminCtx, devA.id)).filter((u) => u.shape).length).toBe(0);
  });

  it("rejects SVG, empty, oversized and degenerate input", async () => {
    await expect(savePlan(a.adminCtx, devA.id, SVG)).rejects.toThrow(/Formato no válido/);
    await expect(savePlan(a.adminCtx, devA.id, new Uint8Array())).rejects.toThrow(/vacío/);
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    big.set(PNG);
    await expect(savePlan(a.adminCtx, devA.id, big)).rejects.toThrow(/5 MB/);
    await expect(
      setUnitShape(a.adminCtx, devA.id, unitA, [[0.1, 0.1], [0.1000001, 0.1], [0.1, 0.1000001]]),
    ).rejects.toThrow(/pequeño/);
    await expect(setUnitShape(a.adminCtx, devA.id, unitA, [[0, 0], [1, 1]] as never)).rejects.toThrow();
  });

  it("asesor can view but not upload, outline or delete", async () => {
    const { ctx } = await addMember(a.org.id, "ASESOR");
    expect((await listPlanUnits(ctx, devA.id)).length).toBe(3);
    expect((await getPlanFile(ctx, devA.id)).contentType).toBe("image/png");
    await expect(savePlan(ctx, devA.id, PNG)).rejects.toThrow(/permiso/);
    await expect(setUnitShape(ctx, devA.id, unitA, SQUARE)).rejects.toThrow(/permiso/);
    await expect(deletePlan(ctx, devA.id)).rejects.toThrow(/permiso/);
  });

  it("isolates plans between organizations (including forged ids)", async () => {
    await savePlan(b.adminCtx, devB.id, JPEG);
    // B cannot read A's plan nor write to A's development.
    await expect(getPlanFile(b.adminCtx, devA.id)).rejects.toThrow(/no tiene plano/);
    await expect(savePlan(b.adminCtx, devA.id, PNG)).rejects.toThrow(/no encontrado/i);
    expect((await getPlanFile(a.adminCtx, devA.id)).contentType).toBe("image/png");
    // A unit of B cannot be outlined through A's development, nor the other way around.
    await expect(setUnitShape(a.adminCtx, devA.id, unitB, SQUARE)).rejects.toThrow(/no encontrada/i);
    await setUnitShape(a.adminCtx, devA.id, unitA, SQUARE);
    await expect(setUnitShape(b.adminCtx, devB.id, unitA, SQUARE)).rejects.toThrow(/no encontrada/i);
  });

  it("deleting the plan clears every outline", async () => {
    await deletePlan(a.adminCtx, devA.id);
    expect(await hasPlan(a.adminCtx, devA.id)).toBeNull();
    expect((await listPlanUnits(a.adminCtx, devA.id)).filter((u) => u.shape).length).toBe(0);
    // B is untouched.
    expect(await hasPlan(b.adminCtx, devB.id)).not.toBeNull();
  });
});
