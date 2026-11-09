import "server-only";
import type { ActivityType, Channel, LeadSource, Stage } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { withOrg, type Tx } from "@/server/db/tenant";
import { assertCan, can, leadScope, type Ctx } from "@/server/auth/permissions";
import { DomainError, ForbiddenError, NotFoundError } from "@/server/errors";
import { CHANNEL_LABEL, SOURCE_LABEL } from "@/lib/labels";
import { staleCutoff, OPEN_STAGES } from "@/lib/stale";

export type LeadCreateInput = {
  firstName: string;
  lastName?: string;
  phone: string; // already normalized E.164
  email?: string;
  channel?: Channel;
  campaignId?: string;
  campaignCode?: string;
  developmentId?: string;
  developmentName?: string;
  unitId?: string;
  budget?: number;
  notes?: string;
};

export type LeadCreateMeta = {
  source: LeadSource;
  actorUserId?: string;
  /** Explicit assignee, or "auto" for round-robin by workload. */
  assignTo?: string | "auto";
  consent?: { granted: boolean; ip?: string; userAgent?: string };
  /** Extra text for the creation activity (e.g. message sent on the web form). */
  message?: string;
};

const DEFAULT_CHANNEL: Record<LeadSource, Channel> = {
  MANUAL: "OTRO",
  CSV: "OTRO",
  WEBHOOK: "SITIO_WEB",
  WHATSAPP: "WHATSAPP",
  SEED: "OTRO",
};

/** Contact activities count as "touching" the lead (they reset the stale timer). */
export const CONTACT_ACTIVITIES: ActivityType[] = ["LLAMADA", "WHATSAPP_SALIENTE", "CORREO", "VISITA"];

/** Picks the active member (asesores first) with the fewest open leads. */
export async function pickAssignee(tx: Tx): Promise<string | null> {
  const members = await tx.membership.findMany({ where: { active: true }, select: { userId: true, role: true } });
  if (!members.length) return null;
  const pool = members.some((m) => m.role === "ASESOR") ? members.filter((m) => m.role === "ASESOR") : members;
  const load = await tx.lead.groupBy({
    by: ["assignedToId"],
    where: { stage: { in: OPEN_STAGES }, assignedToId: { in: pool.map((m) => m.userId) } },
    _count: { _all: true },
  });
  const countOf = (id: string) => load.find((l) => l.assignedToId === id)?._count._all ?? 0;
  return pool.map((m) => m.userId).sort((a, b) => countOf(a) - countOf(b) || a.localeCompare(b))[0];
}

async function requireActiveMember(tx: Tx, userId: string) {
  const m = await tx.membership.findFirst({ where: { userId, active: true } });
  if (!m) throw new DomainError("El asesor seleccionado no pertenece a tu equipo.");
}

/**
 * Creates a lead inside an org-scoped transaction, or registers a new touch on the existing lead
 * with the same phone (deduplication). Shared by manual capture, CSV import, web form webhook and WhatsApp.
 */
export async function createLeadTx(tx: Tx, orgId: string, input: LeadCreateInput, meta: LeadCreateMeta) {
  // Resolve campaign (by id or public code) within the tenant.
  let campaign: { id: string; channel: Channel; developmentId: string | null; code: string } | null = null;
  let unknownCode: string | undefined;
  if (input.campaignId) {
    campaign = await tx.campaign.findUnique({ where: { id: input.campaignId } });
    if (!campaign) throw new NotFoundError("Campaña no encontrada.");
  } else if (input.campaignCode) {
    const code = input.campaignCode.trim().toUpperCase();
    campaign = await tx.campaign.findFirst({ where: { code } });
    if (!campaign) unknownCode = code;
  }

  let developmentId = input.developmentId ?? campaign?.developmentId ?? undefined;
  if (input.developmentId) {
    if (!(await tx.development.findUnique({ where: { id: input.developmentId } }))) {
      throw new NotFoundError("Desarrollo no encontrado.");
    }
  } else if (!developmentId && input.developmentName) {
    const dev = await tx.development.findFirst({
      where: { name: { equals: input.developmentName.trim(), mode: "insensitive" } },
    });
    developmentId = dev?.id;
  }
  if (input.unitId) {
    const unit = await tx.unit.findUnique({ where: { id: input.unitId } });
    if (!unit) throw new NotFoundError("Unidad no encontrada.");
    developmentId = unit.developmentId;
  }

  const channel = campaign?.channel ?? input.channel ?? DEFAULT_CHANNEL[meta.source];
  const notice = meta.consent ? await tx.privacyNotice.findFirst({ orderBy: { version: "desc" } }) : null;
  const originText = [
    SOURCE_LABEL[meta.source],
    CHANNEL_LABEL[channel],
    campaign ? `campaña ${campaign.code}` : null,
    unknownCode ? `código de campaña desconocido "${unknownCode}"` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const existing = await tx.lead.findUnique({
    where: { organizationId_phone: { organizationId: orgId, phone: input.phone } },
  });

  if (existing) {
    await tx.activity.create({
      data: {
        organizationId: orgId,
        leadId: existing.id,
        userId: meta.actorUserId,
        type: "SISTEMA",
        body: `Volvió a dejar sus datos (${originText}).${meta.message ? `\nMensaje: ${meta.message}` : ""}`,
      },
    });
    if (meta.consent) {
      await tx.consentRecord.create({
        data: {
          organizationId: orgId,
          leadId: existing.id,
          granted: meta.consent.granted,
          source: meta.source,
          privacyNoticeId: notice?.id,
          ip: meta.consent.ip,
          userAgent: meta.consent.userAgent,
          recordedById: meta.actorUserId,
        },
      });
      if (meta.consent.granted && !existing.consentAt) {
        await tx.lead.update({ where: { id: existing.id }, data: { consentAt: new Date() } });
      }
    }
    return { lead: existing, created: false as const };
  }

  let assignedToId: string | null = null;
  if (meta.assignTo === "auto") assignedToId = await pickAssignee(tx);
  else if (meta.assignTo) {
    await requireActiveMember(tx, meta.assignTo);
    assignedToId = meta.assignTo;
  }

  const now = new Date();
  const lead = await tx.lead.create({
    data: {
      organizationId: orgId,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      email: input.email,
      channel,
      source: meta.source,
      campaignId: campaign?.id,
      developmentId,
      unitId: input.unitId,
      budget: input.budget,
      notes: input.notes,
      assignedToId,
      consentAt: meta.consent?.granted ? now : null,
    },
  });
  await tx.leadStageEvent.create({
    data: { organizationId: orgId, leadId: lead.id, toStage: "NUEVO", userId: meta.actorUserId },
  });
  await tx.activity.create({
    data: {
      organizationId: orgId,
      leadId: lead.id,
      userId: meta.actorUserId,
      type: "SISTEMA",
      body: `Lead creado (${originText}).${meta.message ? `\nMensaje: ${meta.message}` : ""}`,
    },
  });
  if (meta.consent) {
    await tx.consentRecord.create({
      data: {
        organizationId: orgId,
        leadId: lead.id,
        granted: meta.consent.granted,
        source: meta.source,
        privacyNoticeId: notice?.id,
        ip: meta.consent.ip,
        userAgent: meta.consent.userAgent,
        recordedById: meta.actorUserId,
      },
    });
  }
  return { lead, created: true as const };
}

/** Manual capture from the CRM. Asesores always get the lead assigned to themselves. */
export async function createLeadManual(
  ctx: Ctx,
  input: LeadCreateInput & { assignedToId?: string },
) {
  assertCan(ctx, "leads:create");
  const assignTo = can(ctx.role, "leads:assign") ? (input.assignedToId ?? ctx.userId) : ctx.userId;
  return withOrg(ctx.orgId, (tx) =>
    createLeadTx(tx, ctx.orgId, input, {
      source: "MANUAL",
      actorUserId: ctx.userId,
      assignTo,
      consent: { granted: true },
    }),
  );
}

/** Loads a lead the user may access, or throws NotFound (never reveal existence to asesores). */
export async function requireLead(tx: Tx, ctx: Ctx, leadId: string) {
  const lead = await tx.lead.findFirst({ where: { id: leadId, ...leadScope(ctx) } });
  if (!lead) throw new NotFoundError("Lead no encontrado.");
  return lead;
}

export type LeadFilters = {
  q?: string;
  stage?: Stage;
  campaignId?: string;
  channel?: Channel;
  assignedToId?: string;
  developmentId?: string;
  staleOnly?: boolean;
  page?: number;
};

export const PAGE_SIZE = 50;

export async function listLeads(ctx: Ctx, f: LeadFilters) {
  return withOrg(ctx.orgId, async (tx) => {
    const org = await tx.organization.findUniqueOrThrow({ where: { id: ctx.orgId } });
    const where: Prisma.LeadWhereInput = { ...leadScope(ctx) };
    if (f.stage) where.stage = f.stage;
    if (f.campaignId) where.campaignId = f.campaignId;
    if (f.channel) where.channel = f.channel;
    if (f.developmentId) where.developmentId = f.developmentId;
    if (f.assignedToId && can(ctx.role, "leads:viewAll")) {
      where.assignedToId = f.assignedToId === "none" ? null : f.assignedToId;
    }
    if (f.q) {
      const q = f.q.trim().slice(0, 80);
      const digits = q.replace(/\D/g, "");
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
      ];
    }
    if (f.staleOnly) {
      const cutoff = staleCutoff(org.staleLeadHours);
      where.stage = f.stage && OPEN_STAGES.includes(f.stage) ? f.stage : { in: OPEN_STAGES };
      where.AND = [
        {
          OR: [
            { lastContactAt: { lt: cutoff } },
            { lastContactAt: null, createdAt: { lt: cutoff } },
          ],
        },
      ];
    }
    const page = Math.max(1, f.page ?? 1);
    const [total, leads] = await Promise.all([
      tx.lead.count({ where }),
      tx.lead.findMany({
        where,
        include: { campaign: { select: { code: true, name: true } }, development: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);
    return { total, leads, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), staleLeadHours: org.staleLeadHours };
  });
}

export async function getLeadDetail(ctx: Ctx, leadId: string) {
  return withOrg(ctx.orgId, async (tx) => {
    await requireLead(tx, ctx, leadId);
    const lead = await tx.lead.findUniqueOrThrow({
      where: { id: leadId },
      include: {
        campaign: true,
        development: { select: { id: true, name: true } },
        unit: { select: { id: true, code: true, price: true } },
        activities: { orderBy: { createdAt: "desc" }, take: 100 },
        consents: { orderBy: { createdAt: "desc" }, include: { privacyNotice: { select: { version: true } } } },
        tasks: { orderBy: [{ completedAt: { sort: "asc", nulls: "first" } }, { dueAt: "asc" }] },
        messages: { orderBy: { createdAt: "asc" }, take: 200 },
        quotes: { orderBy: { createdAt: "desc" }, include: { unit: { select: { code: true } } } },
      },
    });
    const org = await tx.organization.findUniqueOrThrow({
      where: { id: ctx.orgId },
      select: { staleLeadHours: true },
    });
    const userIds = [
      ...new Set(
        [lead.assignedToId, ...lead.activities.map((a) => a.userId), ...lead.tasks.map((t) => t.assignedToId)].filter(
          (x): x is string => !!x,
        ),
      ),
    ];
    const users = await tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
    return { lead, users: Object.fromEntries(users.map((u) => [u.id, u.name])), staleLeadHours: org.staleLeadHours };
  });
}

export async function updateLead(
  ctx: Ctx,
  leadId: string,
  input: Omit<LeadCreateInput, "campaignCode" | "developmentName"> & { assignedToId?: string },
) {
  return withOrg(ctx.orgId, async (tx) => {
    const lead = await requireLead(tx, ctx, leadId);
    if (input.campaignId && !(await tx.campaign.findUnique({ where: { id: input.campaignId } }))) {
      throw new NotFoundError("Campaña no encontrada.");
    }
    if (input.developmentId && !(await tx.development.findUnique({ where: { id: input.developmentId } }))) {
      throw new NotFoundError("Desarrollo no encontrado.");
    }
    if (input.unitId && !(await tx.unit.findUnique({ where: { id: input.unitId } }))) {
      throw new NotFoundError("Unidad no encontrada.");
    }
    if (input.phone !== lead.phone) {
      const dup = await tx.lead.findFirst({ where: { phone: input.phone, NOT: { id: leadId } } });
      if (dup) throw new DomainError("Ya existe otro lead con ese teléfono.");
    }
    // A lead that already holds a unit (apartado/vendido) keeps the inventory in sync (QA B02).
    const newUnitId = input.unitId ?? null;
    let unitNote = "";
    if (newUnitId !== lead.unitId && (lead.stage === "APARTADO" || lead.stage === "VENDIDO") && lead.unitId) {
      if (lead.stage === "VENDIDO") {
        throw new DomainError("La venta ya está registrada sobre esa unidad; no se puede cambiar. Cambia primero la etapa del cliente.");
      }
      if (newUnitId) {
        const target = await tx.unit.findUnique({ where: { id: newUnitId } });
        if (!target) throw new NotFoundError("Unidad no encontrada.");
        if (target.status !== "DISPONIBLE") {
          throw new DomainError(`La unidad ${target.code} ya está ${target.status === "VENDIDO" ? "vendida" : "apartada"}.`);
        }
        await tx.unit.update({ where: { id: newUnitId }, data: { status: "APARTADO" } });
        unitNote = ` Apartado movido a la unidad ${target.code}.`;
      }
      await tx.unit.updateMany({ where: { id: lead.unitId }, data: { status: "DISPONIBLE" } });
      unitNote ||= " Unidad anterior liberada.";
    }
    const data: Prisma.LeadUncheckedUpdateInput = {
      firstName: input.firstName,
      lastName: input.lastName ?? null,
      phone: input.phone,
      email: input.email ?? null,
      campaignId: input.campaignId ?? null,
      channel: input.channel ?? lead.channel,
      developmentId: input.developmentId ?? null,
      unitId: input.unitId ?? null,
      budget: input.budget ?? null,
      notes: input.notes ?? null,
    };
    const newAssignee = input.assignedToId ?? null;
    if (newAssignee !== lead.assignedToId) {
      if (!can(ctx.role, "leads:assign")) throw new ForbiddenError("Solo un administrador puede reasignar leads.");
      if (newAssignee) await requireActiveMember(tx, newAssignee);
      data.assignedToId = newAssignee;
      const name = newAssignee
        ? (await tx.user.findUnique({ where: { id: newAssignee }, select: { name: true } }))?.name
        : null;
      await tx.activity.create({
        data: {
          organizationId: ctx.orgId,
          leadId,
          userId: ctx.userId,
          type: "ASIGNACION",
          body: name ? `Asignado a ${name}.` : "Lead sin asignar.",
        },
      });
    }
    if (unitNote) {
      await tx.activity.create({
        data: { organizationId: ctx.orgId, leadId, userId: ctx.userId, type: "SISTEMA", body: `Cambio de unidad.${unitNote}` },
      });
    }
    return tx.lead.update({ where: { id: leadId }, data });
  });
}

export async function addActivity(ctx: Ctx, leadId: string, type: ActivityType, body: string) {
  if (!["NOTA", "LLAMADA", "CORREO", "VISITA"].includes(type)) {
    throw new DomainError("Tipo de actividad no permitido.");
  }
  return withOrg(ctx.orgId, async (tx) => {
    const lead = await requireLead(tx, ctx, leadId);
    const activity = await tx.activity.create({
      data: { organizationId: ctx.orgId, leadId, userId: ctx.userId, type, body },
    });
    if (CONTACT_ACTIVITIES.includes(type)) await touchLead(tx, lead, activity.createdAt, ctx.userId);
    return activity;
  });
}

/** Marks a contact with the lead: sets first/last contact, and moves NUEVO -> CONTACTADO. */
export async function touchLead(
  tx: Tx,
  lead: { id: string; organizationId: string; stage: Stage; firstContactAt: Date | null },
  at: Date,
  userId?: string,
) {
  const data: Prisma.LeadUpdateInput = { lastContactAt: at };
  if (!lead.firstContactAt) data.firstContactAt = at;
  if (lead.stage === "NUEVO") {
    data.stage = "CONTACTADO";
    data.stageChangedAt = at;
    await tx.leadStageEvent.create({
      data: { organizationId: lead.organizationId, leadId: lead.id, fromStage: "NUEVO", toStage: "CONTACTADO", userId },
    });
  }
  await tx.lead.update({ where: { id: lead.id }, data });
}

export async function deleteLead(ctx: Ctx, leadId: string) {
  assertCan(ctx, "leads:delete");
  return withOrg(ctx.orgId, async (tx) => {
    const res = await tx.lead.deleteMany({ where: { id: leadId } });
    if (!res.count) throw new NotFoundError("Lead no encontrado.");
  });
}

/** Records that the lead accepted (or revoked) the privacy notice, e.g. after the asesor shared it. */
export async function recordConsent(ctx: Ctx, leadId: string, granted: boolean) {
  return withOrg(ctx.orgId, async (tx) => {
    const lead = await requireLead(tx, ctx, leadId);
    const notice = await tx.privacyNotice.findFirst({ orderBy: { version: "desc" } });
    await tx.consentRecord.create({
      data: {
        organizationId: ctx.orgId,
        leadId,
        granted,
        source: "MANUAL",
        privacyNoticeId: notice?.id,
        recordedById: ctx.userId,
      },
    });
    await tx.lead.update({ where: { id: lead.id }, data: { consentAt: granted ? new Date() : null } });
    await tx.activity.create({
      data: {
        organizationId: ctx.orgId,
        leadId,
        userId: ctx.userId,
        type: "SISTEMA",
        body: granted
          ? `Registró la aceptación del aviso de privacidad (v${notice?.version ?? "?"}).`
          : "El prospecto revocó su consentimiento: no enviar comunicaciones.",
      },
    });
  });
}
