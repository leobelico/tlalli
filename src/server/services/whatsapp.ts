import "server-only";
import { randomUUID } from "node:crypto";
import { withOrg, type Tx } from "@/server/db/tenant";
import type { Ctx } from "@/server/auth/permissions";
import { DomainError } from "@/server/errors";
import { getWhatsAppProvider } from "@/server/whatsapp/providers";
import { findTemplate, renderTemplate } from "@/server/whatsapp/templates";
import type { InboundMessageEvent } from "@/server/whatsapp/types";
import { requireLead, touchLead, createLeadTx } from "./leads";

export const SERVICE_WINDOW_MS = 24 * 3_600_000;

export function isWithinServiceWindow(lastInboundAt: Date | null, now = new Date()): boolean {
  return !!lastInboundAt && now.getTime() - lastInboundAt.getTime() < SERVICE_WINDOW_MS;
}

async function deliver(
  tx: Tx,
  ctx: Ctx,
  lead: Awaited<ReturnType<typeof requireLead>>,
  msg: { body: string; templateName?: string; variables?: string[]; language?: string },
) {
  // Proactive templates require recorded consent. Free-text replies are only possible inside the
  // 24 h window opened by the lead's own message (answering their request).
  if (msg.templateName && !lead.consentAt) {
    throw new DomainError(
      "Este lead no tiene consentimiento registrado del aviso de privacidad. Compártele el aviso y registra su aceptación antes de enviar plantillas.",
    );
  }
  const org = await tx.organization.findUniqueOrThrow({ where: { id: ctx.orgId }, select: { waPhoneNumberId: true } });
  const provider = getWhatsAppProvider();
  const record = await tx.whatsAppMessage.create({
    data: {
      organizationId: ctx.orgId,
      leadId: lead.id,
      direction: "SALIENTE",
      body: msg.body,
      templateName: msg.templateName,
      status: "EN_COLA",
      sentById: ctx.userId,
    },
  });
  const result = msg.templateName
    ? await provider.sendTemplate({
        fromPhoneNumberId: org.waPhoneNumberId,
        to: lead.phone,
        template: msg.templateName,
        language: msg.language ?? "es_MX",
        variables: msg.variables ?? [],
      })
    : await provider.sendText({ fromPhoneNumberId: org.waPhoneNumberId, to: lead.phone, body: msg.body });

  if (!result.ok) {
    await tx.whatsAppMessage.update({ where: { id: record.id }, data: { status: "FALLIDO", error: result.error } });
    return { ok: false as const, error: result.error };
  }
  const now = new Date();
  await tx.whatsAppMessage.update({
    where: { id: record.id },
    data: { status: "ENVIADO", providerId: result.providerId },
  });
  await tx.activity.create({
    data: {
      organizationId: ctx.orgId,
      leadId: lead.id,
      userId: ctx.userId,
      type: "WHATSAPP_SALIENTE",
      body: msg.templateName ? `Plantilla "${msg.templateName}": ${msg.body}` : msg.body,
    },
  });
  await touchLead(tx, lead, now, ctx.userId);
  return { ok: true as const, providerId: result.providerId };
}

export async function sendTemplateToLead(ctx: Ctx, leadId: string, templateName: string, variables: string[]) {
  const template = findTemplate(templateName);
  if (!template) throw new DomainError("Plantilla desconocida.");
  if (variables.length !== template.variables.length || variables.some((v) => !v.trim())) {
    throw new DomainError("Completa todas las variables de la plantilla.");
  }
  const clean = variables.map((v) => v.trim().slice(0, 200));
  return withOrg(ctx.orgId, async (tx) => {
    const lead = await requireLead(tx, ctx, leadId);
    return deliver(tx, ctx, lead, {
      body: renderTemplate(template, clean),
      templateName: template.name,
      language: template.language,
      variables: clean,
    });
  });
}

export async function sendTextToLead(ctx: Ctx, leadId: string, body: string) {
  const text = body.trim();
  if (!text) throw new DomainError("Escribe un mensaje.");
  if (text.length > 4096) throw new DomainError("El mensaje es demasiado largo.");
  return withOrg(ctx.orgId, async (tx) => {
    const lead = await requireLead(tx, ctx, leadId);
    if (!isWithinServiceWindow(lead.lastInboundAt)) {
      throw new DomainError(
        "Pasaron más de 24 h desde el último mensaje del cliente. WhatsApp solo permite enviar una plantilla aprobada.",
      );
    }
    return deliver(tx, ctx, lead, { body: text });
  });
}

/**
 * Stores an inbound message for an organization. Creates the lead if the phone is unknown.
 * Idempotent: Meta may deliver the same webhook more than once.
 */
export async function storeInboundMessage(orgId: string, event: InboundMessageEvent) {
  return withOrg(orgId, async (tx) => {
    const dup = await tx.whatsAppMessage.findFirst({ where: { providerId: event.providerId }, select: { id: true } });
    if (dup) return { duplicate: true as const };

    let lead = await tx.lead.findUnique({
      where: { organizationId_phone: { organizationId: orgId, phone: event.from } },
    });
    let created = false;
    if (!lead) {
      // Unknown number: a new lead that wrote first. No privacy consent yet (the asesor must
      // share the notice and record it before sending marketing templates).
      const [firstName, ...rest] = (event.profileName?.trim() || "Prospecto WhatsApp").split(/\s+/);
      const res = await createLeadTx(
        tx,
        orgId,
        { firstName, lastName: rest.join(" ") || undefined, phone: event.from, channel: "WHATSAPP" },
        { source: "WHATSAPP", assignTo: "auto", message: event.text },
      );
      lead = res.lead;
      created = res.created;
    }
    await tx.whatsAppMessage.create({
      data: {
        organizationId: orgId,
        leadId: lead.id,
        direction: "ENTRANTE",
        providerId: event.providerId,
        body: event.text,
        status: "RECIBIDO",
        createdAt: event.timestamp,
      },
    });
    if (!created) {
      await tx.activity.create({
        data: { organizationId: orgId, leadId: lead.id, type: "WHATSAPP_ENTRANTE", body: event.text },
      });
    }
    if (!lead.lastInboundAt || lead.lastInboundAt < event.timestamp) {
      await tx.lead.update({ where: { id: lead.id }, data: { lastInboundAt: event.timestamp } });
    }
    return { duplicate: false as const, leadId: lead.id, leadCreated: created };
  });
}

/** Dev-only: simulate an inbound message from the lead (mock provider). */
export async function simulateInbound(ctx: Ctx, leadId: string, text: string) {
  if (getWhatsAppProvider().name !== "mock") throw new DomainError("Solo disponible con el proveedor simulado.");
  const lead = await withOrg(ctx.orgId, (tx) => requireLead(tx, ctx, leadId));
  return storeInboundMessage(ctx.orgId, {
    kind: "message",
    phoneNumberId: "mock",
    from: lead.phone,
    providerId: `mock.in.${randomUUID()}`,
    timestamp: new Date(),
    text: text.slice(0, 4000),
  });
}
