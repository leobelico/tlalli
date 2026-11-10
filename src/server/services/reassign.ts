import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Stage } from "@/generated/prisma/enums";
import { withOrg, type Tx } from "@/server/db/tenant";
import { assertCan, type Ctx } from "@/server/auth/permissions";
import { DomainError, NotFoundError } from "@/server/errors";
import { notifyLeadsAssignedSummary } from "@/server/notify/leads";
import { leadWhere, type LeadFilters } from "./leads";
import { stalePolicy } from "@/lib/stale";

/** Closed deals keep their seller: reassigning them would rewrite sales and commission history. */
export const CLOSED_STAGES: Stage[] = ["VENDIDO", "PERDIDO"];

export async function assertHeir(tx: Tx, userId: string) {
  const m = await tx.membership.findFirst({ where: { userId, active: true } });
  if (!m) throw new DomainError("La persona elegida no pertenece a tu equipo o está inactiva.");
}

/**
 * Reassigns every open lead matching `where` to `toUserId` (or leaves them unassigned), with one
 * ASIGNACION activity per lead. Runs inside the caller's tenant transaction.
 */
export async function reassignInTx(tx: Tx, ctx: Ctx, where: Prisma.LeadWhereInput, toUserId: string | null, reason: string) {
  const leads = await tx.lead.findMany({
    where: {
      AND: [
        where,
        { stage: { notIn: CLOSED_STAGES } },
        toUserId ? { OR: [{ assignedToId: null }, { assignedToId: { not: toUserId } }] } : { assignedToId: { not: null } },
      ],
    },
    select: { id: true, assignedToId: true },
  });
  const ids = leads.map((l) => l.id);
  const moves = leads.map((l) => ({ id: l.id, from: l.assignedToId }));
  if (!ids.length) return { ids, moves };
  await tx.lead.updateMany({ where: { id: { in: ids } }, data: { assignedToId: toUserId } });
  const name = toUserId ? (await tx.user.findUnique({ where: { id: toUserId }, select: { name: true } }))?.name : null;
  await tx.activity.createMany({
    data: ids.map((leadId) => ({
      organizationId: ctx.orgId,
      leadId,
      userId: ctx.userId,
      type: "ASIGNACION" as const,
      body: name ? `Asignado a ${name} (${reason}).` : `Lead sin asignar (${reason}).`,
    })),
  });
  return { ids, moves };
}

/** Server-side window to undo a bulk reassignment (the screen offers 10 s). */
export const UNDO_REASSIGN_WINDOW_MS = 30_000;

/** Bulk reassignment from the leads list: applies to exactly the leads the current filters show (QA B17). */
export async function reassignLeads(ctx: Ctx, filters: LeadFilters, toUserId: string | null) {
  assertCan(ctx, "leads:assign");
  const { ids, batchId } = await withOrg(ctx.orgId, async (tx) => {
    if (toUserId) await assertHeir(tx, toUserId);
    const org = await tx.organization.findUniqueOrThrow({ where: { id: ctx.orgId }, select: { staleLeadHours: true, staleHoursByStage: true } });
    const r = await reassignInTx(tx, ctx, leadWhere(ctx, filters, stalePolicy(org)), toUserId, "reasignación masiva");
    const batch = r.ids.length
      ? await tx.reassignmentBatch.create({ data: { organizationId: ctx.orgId, userId: ctx.userId, toUserId, moves: r.moves } })
      : null;
    return { ids: r.ids, batchId: batch?.id ?? null };
  });
  if (toUserId && ids.length) await notifyLeadsAssignedSummary(ctx.orgId, new Map([[toUserId, ids.length]]), ctx.userId);
  return { count: ids.length, batchId };
}

/**
 * Puts the leads of a bulk reassignment back with their previous owner. Leads that somebody moved
 * again since are left alone and counted as skipped. Only the author, once, within the window.
 */
export async function undoReassignment(ctx: Ctx, batchId: string) {
  assertCan(ctx, "leads:assign");
  return withOrg(ctx.orgId, async (tx) => {
    const b = await tx.reassignmentBatch.findUnique({ where: { id: batchId } });
    if (!b) throw new NotFoundError("Reasignación no encontrada.");
    if (b.userId !== ctx.userId) throw new DomainError("Solo quien lo hizo puede deshacer este cambio.");
    if (b.undoneAt) throw new DomainError("Este cambio ya se deshizo.");
    if (Date.now() - b.createdAt.getTime() > UNDO_REASSIGN_WINDOW_MS) {
      throw new DomainError("Pasó demasiado tiempo para deshacerlo. Vuelve a reasignar los leads manualmente.");
    }
    // claim first, so a double click cannot undo twice
    const claimed = await tx.reassignmentBatch.updateMany({ where: { id: b.id, undoneAt: null }, data: { undoneAt: new Date() } });
    if (claimed.count === 0) throw new DomainError("Este cambio ya se deshizo.");
    const moves = b.moves as { id: string; from: string | null }[];
    let restored = 0;
    for (const m of moves) {
      // only if the lead is still where the batch put it
      const res = await tx.lead.updateMany({ where: { id: m.id, assignedToId: b.toUserId }, data: { assignedToId: m.from } });
      if (res.count) {
        restored++;
        await tx.activity.create({
          data: { organizationId: ctx.orgId, leadId: m.id, userId: ctx.userId, type: "ASIGNACION", body: "Se deshizo la reasignación masiva: el lead regresó a su asesor anterior." },
        });
      }
    }
    return { restored, skipped: moves.length - restored };
  });
}

/** Open leads (not sold or lost) the current list filters show: what a bulk reassignment can touch. */
export async function countReassignable(ctx: Ctx, filters: LeadFilters) {
  assertCan(ctx, "leads:assign");
  return withOrg(ctx.orgId, async (tx) => {
    const org = await tx.organization.findUniqueOrThrow({ where: { id: ctx.orgId }, select: { staleLeadHours: true, staleHoursByStage: true } });
    return tx.lead.count({ where: { AND: [leadWhere(ctx, { ...filters, page: undefined }, stalePolicy(org)), { stage: { notIn: CLOSED_STAGES } }] } });
  });
}
