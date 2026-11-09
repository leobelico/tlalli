import "server-only";
import type { UnitStatus, UnitType } from "@/generated/prisma/enums";
import { withOrg, type Tx } from "@/server/db/tenant";
import { assertCan, type Ctx } from "@/server/auth/permissions";
import { DomainError, NotFoundError } from "@/server/errors";
import { PLANS } from "@/lib/plans";

export type DevelopmentInput = {
  name: string;
  city: string;
  address?: string;
  description?: string;
};

export type UnitInput = {
  code: string;
  type: UnitType;
  areaM2?: number;
  price: number;
  status: UnitStatus;
  notes?: string;
};

/**
 * Foreign keys are checked by Postgres WITHOUT RLS, so a forged id from another tenant would be
 * accepted. Always resolve referenced ids through the tenant transaction first.
 */
export async function requireDevelopment(tx: Tx, id: string) {
  const dev = await tx.development.findUnique({ where: { id } });
  if (!dev) throw new NotFoundError("Desarrollo no encontrado.");
  return dev;
}

const collator = new Intl.Collator("es-MX", { numeric: true, sensitivity: "base" });
export const naturalCompare = (a: string, b: string) => collator.compare(a, b);

export async function listDevelopments(ctx: Ctx, opts: { includeInactive?: boolean } = {}) {
  return withOrg(ctx.orgId, async (tx) => {
    const devs = await tx.development.findMany({
      where: opts.includeInactive ? {} : { active: true },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });
    const counts = await tx.unit.groupBy({ by: ["developmentId", "status"], _count: { _all: true } });
    return devs.map((d) => {
      const c = { DISPONIBLE: 0, APARTADO: 0, VENDIDO: 0 } as Record<UnitStatus, number>;
      for (const row of counts) if (row.developmentId === d.id) c[row.status] = row._count._all;
      return { ...d, unitCounts: c, totalUnits: c.DISPONIBLE + c.APARTADO + c.VENDIDO };
    });
  });
}

export async function getDevelopment(ctx: Ctx, id: string, status?: UnitStatus) {
  return withOrg(ctx.orgId, async (tx) => {
    const dev = await tx.development.findUnique({
      where: { id },
      include: {
        units: { where: status ? { status } : {} },
      },
    });
    if (!dev) throw new NotFoundError("Desarrollo no encontrado.");
    // Natural order: "Lote 2" before "Lote 10".
    dev.units.sort((a, b) => naturalCompare(a.code, b.code));
    return dev;
  });
}

export async function createDevelopment(ctx: Ctx, input: DevelopmentInput) {
  assertCan(ctx, "developments:write");
  return withOrg(ctx.orgId, async (tx) => {
    const org = await tx.organization.findUniqueOrThrow({ where: { id: ctx.orgId } });
    if (org.plan === "BASICO") {
      const active = await tx.development.count({ where: { active: true } });
      if (active >= 1) {
        throw new DomainError(
          `El plan ${PLANS.BASICO.name} incluye 1 desarrollo activo. Cambia a ${PLANS.PROFESIONAL.name} para agregar más.`,
        );
      }
    }
    return tx.development.create({ data: { ...input, organizationId: ctx.orgId } });
  });
}

export async function updateDevelopment(ctx: Ctx, id: string, input: DevelopmentInput & { active: boolean }) {
  assertCan(ctx, "developments:write");
  return withOrg(ctx.orgId, async (tx) => {
    await requireDevelopment(tx, id);
    return tx.development.update({ where: { id }, data: input });
  });
}

function uniqueViolation(e: unknown) {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";
}

export async function createUnit(ctx: Ctx, developmentId: string, input: UnitInput) {
  assertCan(ctx, "units:write");
  return withOrg(ctx.orgId, async (tx) => {
    await requireDevelopment(tx, developmentId);
    try {
      return await tx.unit.create({ data: { ...input, developmentId, organizationId: ctx.orgId } });
    } catch (e) {
      if (uniqueViolation(e)) throw new DomainError(`Ya existe una unidad con la clave "${input.code}".`);
      throw e;
    }
  });
}

/** Creates units "<prefix><n>" for n in [from, to]. Skips codes that already exist. */
export async function bulkCreateUnits(
  ctx: Ctx,
  developmentId: string,
  input: { prefix: string; from: number; to: number; type: UnitType; areaM2?: number; price: number },
) {
  assertCan(ctx, "units:write");
  if (input.to < input.from) throw new DomainError("El número final debe ser mayor o igual al inicial.");
  if (input.to - input.from + 1 > 500) throw new DomainError("Máximo 500 unidades por carga.");
  return withOrg(ctx.orgId, async (tx) => {
    await requireDevelopment(tx, developmentId);
    const data = [];
    for (let n = input.from; n <= input.to; n++) {
      data.push({
        organizationId: ctx.orgId,
        developmentId,
        code: `${input.prefix}${n}`.trim(),
        type: input.type,
        areaM2: input.areaM2,
        price: input.price,
      });
    }
    const res = await tx.unit.createMany({ data, skipDuplicates: true });
    return res.count;
  });
}

/**
 * A unit held (APARTADO) or sold (VENDIDO) by a lead cannot be freed by hand: the lead's stage is the
 * source of truth. Otherwise the same lot could be booked twice (QA B01).
 */
async function assertNotHeld(tx: Tx, unit: { id: string; code: string }) {
  const holder = await tx.lead.findFirst({
    where: { unitId: unit.id, stage: { in: ["APARTADO", "VENDIDO"] } },
    select: { firstName: true, lastName: true, stage: true },
  });
  if (!holder) return;
  const who = [holder.firstName, holder.lastName].filter(Boolean).join(" ");
  const state = holder.stage === "VENDIDO" ? "vendida" : "apartada";
  throw new DomainError(
    `La unidad ${unit.code} está ${state} por ${who}. Para liberarla, cambia primero la etapa de ese cliente (por ejemplo a Perdido).`,
  );
}

export async function updateUnit(ctx: Ctx, unitId: string, input: UnitInput) {
  assertCan(ctx, "units:write");
  return withOrg(ctx.orgId, async (tx) => {
    const unit = await tx.unit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundError("Unidad no encontrada.");
    if (input.status === "DISPONIBLE" && unit.status !== "DISPONIBLE") await assertNotHeld(tx, unit);
    try {
      return await tx.unit.update({ where: { id: unitId }, data: input });
    } catch (e) {
      if (uniqueViolation(e)) throw new DomainError(`Ya existe una unidad con la clave "${input.code}".`);
      throw e;
    }
  });
}

export async function setUnitStatus(ctx: Ctx, unitId: string, status: UnitStatus) {
  assertCan(ctx, "units:write");
  return withOrg(ctx.orgId, async (tx) => {
    const unit = await tx.unit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundError("Unidad no encontrada.");
    if (status === "DISPONIBLE" && unit.status !== "DISPONIBLE") await assertNotHeld(tx, unit);
    await tx.unit.update({ where: { id: unitId }, data: { status } });
  });
}

export async function deleteUnit(ctx: Ctx, unitId: string) {
  assertCan(ctx, "units:write");
  return withOrg(ctx.orgId, async (tx) => {
    const quotes = await tx.quote.count({ where: { unitId } });
    if (quotes > 0) throw new DomainError("La unidad tiene cotizaciones; márcala como vendida o apartada en lugar de borrarla.");
    const res = await tx.unit.deleteMany({ where: { id: unitId } });
    if (res.count === 0) throw new NotFoundError("Unidad no encontrada.");
  });
}

/** Units for dropdowns (lead interest, quoter). */
export async function listUnitsForSelect(ctx: Ctx, developmentId?: string) {
  const units = await withOrg(ctx.orgId, (tx) =>
    tx.unit.findMany({
      where: developmentId ? { developmentId } : {},
      select: { id: true, code: true, price: true, status: true, type: true, developmentId: true, development: { select: { name: true } } },
    }),
  );
  return units.sort(
    (a, b) => naturalCompare(a.development.name, b.development.name) || naturalCompare(a.code, b.code),
  );
}
