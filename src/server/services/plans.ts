import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { withOrg } from "@/server/db/tenant";
import { assertCan, type Ctx } from "@/server/auth/permissions";
import { DomainError, NotFoundError } from "@/server/errors";
import {
  MAX_PLAN_BYTES,
  parseShape,
  shapeArea,
  sniffImageType,
  planShapeSchema,
  type PlanShape,
} from "@/lib/plan-shape";
import { naturalCompare, requireDevelopment } from "./inventory";

export async function hasPlan(ctx: Ctx, developmentId: string) {
  return withOrg(ctx.orgId, async (tx) => {
    const plan = await tx.developmentPlan.findUnique({
      where: { developmentId },
      select: { updatedAt: true },
    });
    return plan ? { updatedAt: plan.updatedAt } : null;
  });
}

/** Units of a development with their outline on the plan (null when not marked yet). */
export async function listPlanUnits(ctx: Ctx, developmentId: string) {
  const units = await withOrg(ctx.orgId, (tx) =>
    tx.unit.findMany({
      where: { developmentId },
      select: {
        id: true,
        code: true,
        type: true,
        status: true,
        areaM2: true,
        price: true,
        planShape: true,
      },
    }),
  );
  return units.map((u) => ({ ...u, shape: parseShape(u.planShape) })).sort((a, b) => naturalCompare(a.code, b.code));
}

export async function savePlan(ctx: Ctx, developmentId: string, bytes: Uint8Array) {
  assertCan(ctx, "units:write");
  if (bytes.length === 0) throw new DomainError("El archivo está vacío.");
  if (bytes.length > MAX_PLAN_BYTES) throw new DomainError("El plano pesa más de 5 MB. Exporta una imagen más ligera.");
  const contentType = sniffImageType(bytes);
  if (!contentType)
    throw new DomainError("Formato no válido. Sube una imagen PNG, JPG o WebP (si es PDF, expórtalo como imagen).");
  const data = Buffer.from(bytes);
  return withOrg(ctx.orgId, async (tx) => {
    await requireDevelopment(tx, developmentId);
    await tx.developmentPlan.upsert({
      where: { developmentId },
      create: {
        organizationId: ctx.orgId,
        developmentId,
        contentType,
        sizeBytes: bytes.length,
        data,
      },
      update: { contentType, sizeBytes: bytes.length, data },
    });
  });
}

export async function deletePlan(ctx: Ctx, developmentId: string) {
  assertCan(ctx, "units:write");
  return withOrg(ctx.orgId, async (tx) => {
    await requireDevelopment(tx, developmentId);
    await tx.developmentPlan.deleteMany({ where: { developmentId } });
    // Outlines make no sense without the image they were drawn on.
    await tx.unit.updateMany({
      where: { developmentId },
      data: { planShape: Prisma.DbNull },
    });
  });
}

export async function getPlanFile(ctx: Ctx, developmentId: string) {
  const plan = await withOrg(ctx.orgId, (tx) => tx.developmentPlan.findUnique({ where: { developmentId } }));
  if (!plan) throw new NotFoundError("Este desarrollo no tiene plano.");
  return {
    contentType: plan.contentType,
    data: plan.data,
    updatedAt: plan.updatedAt,
  };
}

/** Sets (or clears, with null) the outline of a unit. The unit must belong to the given development. */
export async function setUnitShape(ctx: Ctx, developmentId: string, unitId: string, shape: PlanShape | null) {
  assertCan(ctx, "units:write");
  if (shape) {
    const parsed = planShapeSchema.safeParse(shape);
    if (!parsed.success) throw new DomainError(parsed.error.issues[0]?.message ?? "Contorno inválido.");
    if (shapeArea(shape) < 0.00002)
      throw new DomainError("El contorno es demasiado pequeño; marca los puntos de nuevo.");
  }
  return withOrg(ctx.orgId, async (tx) => {
    const plan = await tx.developmentPlan.findUnique({
      where: { developmentId },
      select: { id: true },
    });
    if (!plan) throw new DomainError("Sube primero el plano del desarrollo.");
    const res = await tx.unit.updateMany({
      where: { id: unitId, developmentId },
      data: { planShape: shape ?? Prisma.DbNull },
    });
    if (res.count === 0) throw new NotFoundError("Unidad no encontrada en este desarrollo.");
  });
}
