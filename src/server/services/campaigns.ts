import "server-only";
import type { Channel } from "@/generated/prisma/enums";
import { withOrg } from "@/server/db/tenant";
import { assertCan, type Ctx } from "@/server/auth/permissions";
import { DomainError, NotFoundError } from "@/server/errors";
import { requireDevelopment } from "./inventory";

export type CampaignInput = {
  name: string;
  channel: Channel;
  code: string;
  spend?: number;
  startDate?: Date;
  endDate?: Date;
  developmentId?: string;
};

function isUniqueViolation(e: unknown) {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";
}

export async function listCampaigns(ctx: Ctx) {
  return withOrg(ctx.orgId, async (tx) => {
    const campaigns = await tx.campaign.findMany({
      include: { development: { select: { name: true } } },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    });
    const counts = await tx.lead.groupBy({ by: ["campaignId"], _count: { _all: true } });
    const sold = await tx.lead.groupBy({ by: ["campaignId"], where: { stage: "VENDIDO" }, _count: { _all: true } });
    return campaigns.map((c) => ({
      ...c,
      leadCount: counts.find((r) => r.campaignId === c.id)?._count._all ?? 0,
      soldCount: sold.find((r) => r.campaignId === c.id)?._count._all ?? 0,
    }));
  });
}

export async function listCampaignsForSelect(ctx: Ctx) {
  return withOrg(ctx.orgId, (tx) =>
    tx.campaign.findMany({
      where: { active: true },
      select: { id: true, name: true, code: true, channel: true },
      orderBy: { name: "asc" },
    }),
  );
}

export async function createCampaign(ctx: Ctx, input: CampaignInput) {
  assertCan(ctx, "campaigns:write");
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    throw new DomainError("La fecha de fin no puede ser anterior al inicio.");
  }
  return withOrg(ctx.orgId, async (tx) => {
    if (input.developmentId) await requireDevelopment(tx, input.developmentId);
    try {
      return await tx.campaign.create({ data: { ...input, organizationId: ctx.orgId } });
    } catch (e) {
      if (isUniqueViolation(e)) throw new DomainError(`El código ${input.code} ya está en uso.`);
      throw e;
    }
  });
}

export async function updateCampaign(ctx: Ctx, id: string, input: CampaignInput & { active: boolean }) {
  assertCan(ctx, "campaigns:write");
  return withOrg(ctx.orgId, async (tx) => {
    const existing = await tx.campaign.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Campaña no encontrada.");
    if (input.developmentId) await requireDevelopment(tx, input.developmentId);
    try {
      return await tx.campaign.update({
        where: { id },
        data: { ...input, spend: input.spend ?? null, developmentId: input.developmentId ?? null },
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw new DomainError(`El código ${input.code} ya está en uso.`);
      throw e;
    }
  });
}
