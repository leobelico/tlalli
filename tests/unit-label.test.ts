import { describe, expect, it } from "vitest";
import { unitDisplayName } from "@/lib/labels";

/** QA2 B42: the PDF said "Lote Lote 1" because the type and the code both start with "Lote". */
describe("unitDisplayName", () => {
  it("does not repeat the type when the code already says it", () => {
    expect(unitDisplayName("LOTE", "Lote 1")).toBe("Lote 1");
    expect(unitDisplayName("LOTE", "lote 12")).toBe("lote 12");
    expect(unitDisplayName("DEPARTAMENTO", "Depto 7")).toBe("Depto 7");
    expect(unitDisplayName("DEPARTAMENTO", "Departamento 3B")).toBe("Departamento 3B");
    expect(unitDisplayName("CASA", "Casa 4")).toBe("Casa 4");
    expect(unitDisplayName("LOCAL", "Local 2")).toBe("Local 2");
    expect(unitDisplayName("LOTE", "Lt 5")).toBe("Lt 5");
  });

  it("adds the type when the code does not carry it", () => {
    expect(unitDisplayName("LOTE", "Mz 3 Lt 1")).toBe("Lote Mz 3 Lt 1");
    expect(unitDisplayName("LOTE", "A-12")).toBe("Lote A-12");
    expect(unitDisplayName("CASA", "12")).toBe("Casa 12");
    expect(unitDisplayName("DEPARTAMENTO", "302")).toBe("Departamento 302");
  });

  it("does not mistake a word that merely starts like the type", () => {
    expect(unitDisplayName("LOTE", "Loteamiento 5")).toBe("Lote Loteamiento 5");
    expect(unitDisplayName("CASA", "Casablanca 2")).toBe("Casa Casablanca 2");
    expect(unitDisplayName("LOCAL", "Localidad 1")).toBe("Local comercial Localidad 1");
  });
});
