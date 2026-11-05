import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  bulkCreateUnits,
  createDevelopment,
  createUnit,
  getDevelopment,
  listDevelopments,
  setUnitStatus,
} from "@/server/services/inventory";
import { rootPrisma } from "@/server/db/root";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

describe("developments and units", () => {
  let a: Awaited<ReturnType<typeof makeOrg>>;
  let b: Awaited<ReturnType<typeof makeOrg>>;
  let devA: { id: string };
  let devB: { id: string };

  beforeAll(async () => {
    a = await makeOrg("Inv A");
    b = await makeOrg("Inv B");
    devA = await createDevelopment(a.adminCtx, { name: "Lomas A", city: "San Luis Potosí" });
    devB = await createDevelopment(b.adminCtx, { name: "Lomas B", city: "San Luis Potosí" });
  });
  afterAll(cleanup);

  it("admin creates units and counts by status", async () => {
    const n = await bulkCreateUnits(a.adminCtx, devA.id, { prefix: "Lote ", from: 1, to: 10, type: "LOTE", price: 450000 });
    expect(n).toBe(10);
    // duplicates are skipped
    expect(await bulkCreateUnits(a.adminCtx, devA.id, { prefix: "Lote ", from: 9, to: 12, type: "LOTE", price: 1 })).toBe(2);
    const dev = await getDevelopment(a.adminCtx, devA.id);
    await setUnitStatus(a.adminCtx, dev.units[0].id, "VENDIDO");
    const [summary] = await listDevelopments(a.adminCtx);
    expect(summary.totalUnits).toBe(12);
    expect(summary.unitCounts.VENDIDO).toBe(1);
  });

  it("rejects duplicate unit codes with a friendly error", async () => {
    await expect(
      createUnit(a.adminCtx, devA.id, { code: "Lote 1", type: "LOTE", price: 1, status: "DISPONIBLE" }),
    ).rejects.toThrow(/Ya existe/);
  });

  it("asesor can view but not modify inventory", async () => {
    const { ctx } = await addMember(a.org.id, "ASESOR");
    expect((await listDevelopments(ctx)).length).toBe(1);
    await expect(createDevelopment(ctx, { name: "X", city: "SLP" })).rejects.toThrow(/permiso/);
    await expect(
      createUnit(ctx, devA.id, { code: "Z1", type: "CASA", price: 1, status: "DISPONIBLE" }),
    ).rejects.toThrow(/permiso/);
  });

  it("cannot attach a unit to another org's development (FK bypasses RLS)", async () => {
    await expect(
      createUnit(a.adminCtx, devB.id, { code: "Intrusa", type: "CASA", price: 1, status: "DISPONIBLE" }),
    ).rejects.toThrow(/no encontrado/i);
    expect(await rootPrisma.unit.count({ where: { code: "Intrusa" } })).toBe(0);
  });

  it("cannot read or change another org's units", async () => {
    await expect(getDevelopment(a.adminCtx, devB.id)).rejects.toThrow(/no encontrado/i);
    const unitB = await createUnit(b.adminCtx, devB.id, { code: "Casa 1", type: "CASA", price: 2_000_000, status: "DISPONIBLE" });
    await expect(setUnitStatus(a.adminCtx, unitB.id, "VENDIDO")).rejects.toThrow(/no encontrada/i);
    expect((await rootPrisma.unit.findUniqueOrThrow({ where: { id: unitB.id } })).status).toBe("DISPONIBLE");
  });

  it("plan Básico allows a single active development", async () => {
    const small = await makeOrg("Inv Chica");
    await rootPrisma.organization.update({ where: { id: small.org.id }, data: { plan: "BASICO" } });
    await createDevelopment(small.adminCtx, { name: "Uno", city: "SLP" });
    await expect(createDevelopment(small.adminCtx, { name: "Dos", city: "SLP" })).rejects.toThrow(/1 desarrollo/);
  });
});
