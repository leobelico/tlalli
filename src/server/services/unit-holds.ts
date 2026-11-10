import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { DomainError } from "@/server/errors";

/** Name of the partial unique index that allows one APARTADO/VENDIDO lead per unit. */
export const HOLD_INDEX = "leads_one_hold_per_unit";
export const HOLD_STAGES = ["APARTADO", "VENDIDO"] as const;

/** True when `e` is the database refusing a second holder for the same unit (QA2 B35). */
export function isHoldViolation(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const err = e as { code?: string; message?: string; meta?: unknown };
  if (err.code !== "P2002") return false;
  return String(err.message ?? "").includes(HOLD_INDEX) || JSON.stringify(err.meta ?? {}).includes(HOLD_INDEX);
}

export const holdTakenError = (unitCode?: string) =>
  new DomainError(`La unidad${unitCode ? ` ${unitCode}` : ""} ya fue apartada por otro cliente.`);

/** Runs `fn`; a lost race on the unique index becomes the plain message instead of "error inesperado". */
export async function translatingHoldViolation<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isHoldViolation(e)) throw holdTakenError();
    throw e;
  }
}

/**
 * Serializes everything that can change who holds a unit. Always lead first, then units in id order,
 * so two transactions can never wait on each other.
 */
export async function lockLead(tx: Prisma.TransactionClient, leadId: string) {
  await tx.$queryRaw`SELECT id FROM leads WHERE id = ${leadId}::uuid FOR UPDATE`;
}

export async function lockUnits(tx: Prisma.TransactionClient, ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter((x): x is string => !!x))].sort();
  if (unique.length) await tx.$queryRaw`SELECT id FROM units WHERE id = ANY(${unique}::uuid[]) ORDER BY id FOR UPDATE`;
}
