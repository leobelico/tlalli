import "server-only";
import type { LostReason, Stage } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { withOrg } from "@/server/db/tenant";
import { leadScope, type Ctx } from "@/server/auth/permissions";
import { DomainError, NotFoundError } from "@/server/errors";
import { LOST_REASON_LABEL, STAGE_LABEL, STAGES } from "@/lib/labels";
import { formatMoney } from "@/lib/format";
import { requireLead } from "./leads";

export type StageChangeInput = {
  stage: Stage;
  lostReason?: LostReason;
  lostNote?: string;
  saleAmount?: number;
};

export async function changeStage(ctx: Ctx, leadId: string, input: StageChangeInput) {
  return withOrg(ctx.orgId, async (tx) => {
    const lead = await requireLead(tx, ctx, leadId);
    const to = input.stage;
    if (lead.stage === to) return lead;

    if (to === "PERDIDO") {
      if (!input.lostReason) throw new DomainError("Indica el motivo de pérdida.");
      if (input.lostReason === "OTRO" && !input.lostNote?.trim()) {
        throw new DomainError("Describe el motivo de pérdida.");
      }
    }

    const now = new Date();
    const data: Prisma.LeadUpdateInput = { stage: to, stageChangedAt: now };
    if (to === "PERDIDO") {
      data.lostReason = input.lostReason;
      data.lostNote = input.lostNote?.trim() || null;
    } else {
      data.lostReason = null;
      data.lostNote = null;
    }
    // Advancing the lead implies someone talked to them.
    if (to !== "PERDIDO" && to !== "NUEVO") {
      data.lastContactAt = now;
      if (!lead.firstContactAt) data.firstContactAt = now;
    }

    // Keep inventory in sync with the lead's unit of interest.
    let unitNote = "";
    if (lead.unitId) {
      const unit = await tx.unit.findUnique({ where: { id: lead.unitId } });
      if (unit) {
        if (to === "APARTADO") {
          if (unit.status === "VENDIDO") throw new DomainError(`La unidad ${unit.code} ya está vendida.`);
          if (unit.status === "APARTADO" && lead.stage !== "VENDIDO") {
            throw new DomainError(`La unidad ${unit.code} ya está apartada por otro cliente.`);
          }
          await tx.unit.update({ where: { id: unit.id }, data: { status: "APARTADO" } });
          unitNote = ` Unidad ${unit.code} marcada como apartada.`;
        } else if (to === "VENDIDO") {
          if (unit.status === "VENDIDO") throw new DomainError(`La unidad ${unit.code} ya está vendida.`);
          if (unit.status === "APARTADO" && lead.stage !== "APARTADO") {
            throw new DomainError(`La unidad ${unit.code} está apartada por otro cliente.`);
          }
          await tx.unit.update({ where: { id: unit.id }, data: { status: "VENDIDO" } });
          unitNote = ` Unidad ${unit.code} marcada como vendida.`;
          data.saleAmount = input.saleAmount ?? unit.price;
        } else if ((lead.stage === "APARTADO" || lead.stage === "VENDIDO") && unit.status !== "DISPONIBLE") {
          // Deal fell through: release the unit.
          await tx.unit.update({ where: { id: unit.id }, data: { status: "DISPONIBLE" } });
          unitNote = ` Unidad ${unit.code} liberada.`;
        }
      }
    }
    if (to === "VENDIDO") {
      data.soldAt = now;
      if (data.saleAmount === undefined) data.saleAmount = input.saleAmount ?? null;
    } else if (lead.stage === "VENDIDO") {
      data.soldAt = null;
      data.saleAmount = null;
    }

    const updated = await tx.lead.update({ where: { id: leadId }, data });
    await tx.leadStageEvent.create({
      data: { organizationId: ctx.orgId, leadId, fromStage: lead.stage, toStage: to, userId: ctx.userId },
    });
    let body = `${STAGE_LABEL[lead.stage]} → ${STAGE_LABEL[to]}.`;
    if (to === "PERDIDO" && input.lostReason) {
      body += ` Motivo: ${LOST_REASON_LABEL[input.lostReason]}${input.lostNote ? ` — ${input.lostNote}` : ""}.`;
    }
    if (to === "VENDIDO" && updated.saleAmount) body += ` Monto: ${formatMoney(updated.saleAmount)}.`;
    await tx.activity.create({
      data: { organizationId: ctx.orgId, leadId, userId: ctx.userId, type: "CAMBIO_ETAPA", body: body + unitNote },
    });
    return updated;
  });
}

export type PipelineFilters = { developmentId?: string; assignedToId?: string; campaignId?: string; q?: string };

const CLOSED_WINDOW_DAYS = 60;
const MAX_PER_COLUMN = 150;

export async function getPipeline(ctx: Ctx, f: PipelineFilters) {
  return withOrg(ctx.orgId, async (tx) => {
    const org = await tx.organization.findUniqueOrThrow({ where: { id: ctx.orgId }, select: { staleLeadHours: true } });
    const base: Prisma.LeadWhereInput = { ...leadScope(ctx) };
    if (f.developmentId) base.developmentId = f.developmentId;
    if (f.campaignId) base.campaignId = f.campaignId;
    if (f.assignedToId && !("assignedToId" in base)) base.assignedToId = f.assignedToId;
    if (f.q) {
      base.OR = [
        { firstName: { contains: f.q, mode: "insensitive" } },
        { lastName: { contains: f.q, mode: "insensitive" } },
      ];
    }
    const closedSince = new Date(Date.now() - CLOSED_WINDOW_DAYS * 86_400_000);
    const columns = await Promise.all(
      STAGES.map(async (stage) => {
        const where: Prisma.LeadWhereInput = {
          ...base,
          stage,
          ...(stage === "VENDIDO" || stage === "PERDIDO" ? { stageChangedAt: { gte: closedSince } } : {}),
        };
        const [count, leads] = await Promise.all([
          tx.lead.count({ where }),
          tx.lead.findMany({
            where,
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              stage: true,
              createdAt: true,
              lastContactAt: true,
              stageChangedAt: true,
              assignedToId: true,
              budget: true,
              campaign: { select: { code: true } },
              development: { select: { name: true } },
              unit: { select: { code: true } },
            },
            orderBy: { stageChangedAt: "desc" },
            take: MAX_PER_COLUMN,
          }),
        ]);
        return { stage, count, leads };
      }),
    );
    return { columns, staleLeadHours: org.staleLeadHours, closedWindowDays: CLOSED_WINDOW_DAYS };
  });
}

export async function getLeadStage(ctx: Ctx, leadId: string) {
  return withOrg(ctx.orgId, async (tx) => {
    const lead = await tx.lead.findFirst({ where: { id: leadId, ...leadScope(ctx) }, select: { stage: true } });
    if (!lead) throw new NotFoundError("Lead no encontrado.");
    return lead.stage;
  });
}
