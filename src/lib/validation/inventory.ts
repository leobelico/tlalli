import { z } from "zod";
import { moneySchema, nameSchema, optionalMoney, optionalText } from "./common";

export const developmentSchema = z.object({
  name: nameSchema,
  city: z.string().trim().min(2, { error: "Escribe la ciudad." }).max(80),
  address: optionalText(200),
  description: optionalText(1000),
});

export const unitTypeSchema = z.enum(["LOTE", "CASA", "DEPARTAMENTO", "LOCAL"], { error: "Tipo inválido." });
export const unitStatusSchema = z.enum(["DISPONIBLE", "APARTADO", "VENDIDO"], { error: "Estatus inválido." });

export const unitSchema = z.object({
  code: z.string().trim().min(1, { error: "Escribe la clave (ej. Lote 12)." }).max(40),
  type: unitTypeSchema,
  areaM2: optionalMoney,
  price: moneySchema.refine((v) => v > 0, { error: "El precio debe ser mayor a 0." }),
  status: unitStatusSchema.default("DISPONIBLE"),
  notes: optionalText(500),
});

export const bulkUnitsSchema = z.object({
  // Not trimmed: "Lote " + 1 must produce "Lote 1".
  prefix: z.string().max(20).default(""),
  from: z.coerce.number().int().min(0).max(100_000),
  to: z.coerce.number().int().min(0).max(100_000),
  type: unitTypeSchema,
  areaM2: optionalMoney,
  price: moneySchema.refine((v) => v > 0, { error: "El precio debe ser mayor a 0." }),
});
