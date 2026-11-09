import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Stage } from "@/generated/prisma/enums";
import { withOrg, type Tx } from "@/server/db/tenant";
import { assertCan, type Ctx } from "@/server/auth/permissions";
import { DomainError } from "@/server/errors";
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
    select: { id: true },
  });
  const ids = leads.map((l) => l.id);
  if (!ids.length) return { ids };
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
  return { ids };
}

/** Bulk reassignment from the leads list: applies to exactly the leads the current filters show (QA B17). */
export async function reassignLeads(ctx: Ctx, filters: LeadFilters, toUserId: string | null) {
  assertCan(ctx, "leads:assign");
  const { ids } = await withOrg(ctx.orgId, async (tx) => {
    if (toUserId) await assertHeir(tx, toUserId);
    const org = await tx.organization.findUniqueOrThrow({ where: { id: ctx.orgId }, select: { staleLeadHours: true, staleHoursByStage: true } });
    return reassignInTx(tx, ctx, leadWhere(ctx, filters, stalePolicy(org)), toUserId, "reasignación masiva");
  });
  if (toUserId && ids.length) await notifyLeadsAssignedSummary(ctx.orgId, new Map([[toUserId, ids.length]]), ctx.userId);
  return { count: ids.length };
}
