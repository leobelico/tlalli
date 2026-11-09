import "server-only";
import { withOrg } from "@/server/db/tenant";
import { assertCan, type Ctx } from "@/server/auth/permissions";
import { randomToken } from "@/lib/tokens";
import { DomainError } from "@/server/errors";
import { MAX_STALE_HOURS } from "@/lib/stale";
import type { Stage } from "@/generated/prisma/enums";

export async function getOrganization(ctx: Ctx) {
  return withOrg(ctx.orgId, (tx) => tx.organization.findUniqueOrThrow({ where: { id: ctx.orgId } }));
}

export async function updateOrganizationSettings(
  ctx: Ctx,
  input: { name: string; staleLeadHours: number; maxAsesorDiscountPct?: number },
) {
  assertCan(ctx, "org:settings");
  const cap = input.maxAsesorDiscountPct;
  if (cap !== undefined && (!Number.isInteger(cap) || cap < 0 || cap > 100)) {
    throw new DomainError("El descuento máximo debe ser un número entero entre 0 y 100.");
  }
  return withOrg(ctx.orgId, (tx) =>
    tx.organization.update({
      where: { id: ctx.orgId },
      data: {
        name: input.name,
        staleLeadHours: input.staleLeadHours,
        ...(cap === undefined ? {} : { maxAsesorDiscountPct: cap }),
      },
    }),
  );
}

export async function regenerateLeadFormKey(ctx: Ctx) {
  assertCan(ctx, "org:settings");
  return withOrg(ctx.orgId, (tx) =>
    tx.organization.update({ where: { id: ctx.orgId }, data: { leadFormKey: `lfk_${randomToken(24)}` } }),
  );
}

export async function currentPrivacyNotice(ctx: Ctx) {
  return withOrg(ctx.orgId, (tx) => tx.privacyNotice.findFirst({ orderBy: { version: "desc" } }));
}

/** Notices are versioned: editing creates a new version so past consents keep pointing to what the lead saw. */
export async function publishPrivacyNotice(ctx: Ctx, content: string) {
  assertCan(ctx, "org:settings");
  return withOrg(ctx.orgId, async (tx) => {
    const last = await tx.privacyNotice.findFirst({ orderBy: { version: "desc" } });
    if (last && last.content.trim() === content.trim()) return last;
    return tx.privacyNotice.create({
      data: {
        organizationId: ctx.orgId,
        version: (last?.version ?? 0) + 1,
        content,
        createdById: ctx.userId,
      },
    });
  });
}

export async function listMembers(ctx: Ctx) {
  return withOrg(ctx.orgId, (tx) =>
    tx.membership.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    }),
  );
}

/** Active members, for assignment dropdowns. */
export async function listActiveAgents(ctx: Ctx) {
  const members = await withOrg(ctx.orgId, (tx) =>
    tx.membership.findMany({
      where: { active: true },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  );
  return members.map((m) => ({ id: m.user.id, name: m.user.name, role: m.role }));
}

export async function listPendingInvitations(ctx: Ctx) {
  assertCan(ctx, "members:manage");
  return withOrg(ctx.orgId, (tx) =>
    tx.invitation.findMany({
      where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  );
}

/** Every member, active or not: filters must still find the leads of someone who left (QA B17). */
export async function listAllAgents(ctx: Ctx) {
  const members = await withOrg(ctx.orgId, (tx) =>
    tx.membership.findMany({ include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } }),
  );
  return members.map((m) => ({ id: m.user.id, name: m.user.name, role: m.role, active: m.active }));
}

/** Open (not sold / not lost) leads per assignee, for the "who inherits them" prompt. */
export async function openLeadCounts(ctx: Ctx): Promise<Record<string, number>> {
  const rows = await withOrg(ctx.orgId, (tx) =>
    tx.lead.groupBy({ by: ["assignedToId"], where: { stage: { notIn: ["VENDIDO", "PERDIDO"] } }, _count: { _all: true } }),
  );
  return Object.fromEntries(rows.filter((r) => r.assignedToId).map((r) => [r.assignedToId!, r._count._all]));
}

/** Stages whose cold-lead threshold can be tuned (NUEVO uses the base "staleLeadHours"). */
export const TUNABLE_STAGES = ["CONTACTADO", "CITA_AGENDADA", "VISITA_REALIZADA", "COTIZACION"] as const satisfies readonly Stage[];

/** Saves per-stage "cold lead" thresholds (QA B18). Missing stages fall back to the defaults. */
export async function updateStalePolicy(ctx: Ctx, byStage: Partial<Record<(typeof TUNABLE_STAGES)[number], number>>) {
  assertCan(ctx, "org:settings");
  const clean: Record<string, number> = {};
  for (const stage of TUNABLE_STAGES) {
    const v = byStage[stage];
    if (v === undefined) continue;
    if (!Number.isInteger(v) || v < 1 || v > MAX_STALE_HOURS) {
      throw new DomainError(`Cada límite debe ser de 1 a ${MAX_STALE_HOURS} horas completas.`);
    }
    clean[stage] = v;
  }
  await withOrg(ctx.orgId, (tx) => tx.organization.update({ where: { id: ctx.orgId }, data: { staleHoursByStage: clean } }));
}

/** WhatsApp Business number data (advanced section). Kept apart so saving the general settings never wipes it. */
export async function updateWhatsAppSettings(ctx: Ctx, input: { waPhoneNumberId?: string; waDisplayPhone?: string }) {
  assertCan(ctx, "org:settings");
  return withOrg(ctx.orgId, (tx) =>
    tx.organization.update({
      where: { id: ctx.orgId },
      data: { waPhoneNumberId: input.waPhoneNumberId ?? null, waDisplayPhone: input.waDisplayPhone ?? null },
    }),
  );
}
