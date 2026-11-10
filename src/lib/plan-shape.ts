import { z } from "zod";

/** A unit's outline over the plan image: points as fractions (0..1) of the image width/height. */
export type PlanPoint = [number, number];
export type PlanShape = PlanPoint[];

export const MAX_PLAN_BYTES = 5 * 1024 * 1024;

const fraction = z.number().min(0).max(1);

export const planShapeSchema = z
  .array(z.tuple([fraction, fraction]), { error: "Contorno inválido." })
  .min(3, { error: "Marca al menos 3 puntos." })
  .max(60, { error: "Máximo 60 puntos por lote." });

/** Parses a stored JSON value defensively; returns null when it is not a valid shape. */
export function parseShape(value: unknown): PlanShape | null {
  const r = planShapeSchema.safeParse(value);
  return r.success ? (r.data as PlanShape) : null;
}

/** Detects the image type from its magic bytes (never trust the client's Content-Type). SVG is rejected on purpose. */
export function sniffImageType(b: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length >= 12 &&
    String.fromCharCode(b[0], b[1], b[2], b[3]) === "RIFF" &&
    String.fromCharCode(b[8], b[9], b[10], b[11]) === "WEBP"
  )
    return "image/webp";
  return null;
}

/** Polygon area (shoelace), used to reject degenerate outlines. */
export function shapeArea(shape: PlanShape): number {
  let s = 0;
  for (let i = 0; i < shape.length; i++) {
    const [x1, y1] = shape[i];
    const [x2, y2] = shape[(i + 1) % shape.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

export function shapeCentroid(shape: PlanShape): PlanPoint {
  const n = shape.length;
  return [shape.reduce((a, p) => a + p[0], 0) / n, shape.reduce((a, p) => a + p[1], 0) / n];
}
