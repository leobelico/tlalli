import "server-only";
import { rootPrisma } from "@/server/db/root";
import { withOrg } from "@/server/db/tenant";
import { createLeadTx } from "@/server/services/leads";
import { notifyLeadAssigned } from "@/server/notify/leads";
import { webhookLeadSchema, WEBHOOK_ALIASES } from "@/lib/validation/leads";
import type { z } from "zod";

/** Resolves the organization that owns a public form key. Root client: there is no tenant yet. */
export async function findOrgByFormKey(key: string | null | undefined) {
  if (!key || !/^lfk_[\w-]{20,64}$/.test(key)) return null;
  return rootPrisma.organization.findUnique({
    where: { leadFormKey: key },
    select: { id: true, name: true, slug: true },
  });
}

export async function findOrgBySlug(slug: string) {
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  return rootPrisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      leadFormKey: true,
      privacyNotices: { orderBy: { version: "desc" }, take: 1, select: { version: true } },
    },
  });
}

/** Maps English/Spanish aliases to canonical keys; first value wins. */
export function canonicalizePayload(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = WEBHOOK_ALIASES[k.toLowerCase()] ?? k.toLowerCase();
    if (out[key] === undefined) out[key] = typeof v === "number" ? String(v) : v;
  }
  return out;
}

export type IntakeResult =
  | { ok: true; created: boolean; leadId: string }
  | { ok: false; status: 400; errors: Record<string, string[] | undefined> }
  | { ok: true; created: false; leadId: null; ignored: "honeypot" };

export async function intakeWebLead(
  orgId: string,
  rawPayload: Record<string, unknown>,
  meta: { ip?: string; userAgent?: string },
): Promise<IntakeResult> {
  const payload = canonicalizePayload(rawPayload);
  if (typeof payload.website === "string" && payload.website.length > 0) {
    // Bot filled the hidden field: pretend success, store nothing.
    return { ok: true, created: false, leadId: null, ignored: "honeypot" };
  }
  const parsed = webhookLeadSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors = (parsed.error as z.ZodError).issues.reduce<Record<string, string[]>>((acc, issue) => {
      const key = String(issue.path[0] ?? "_");
      (acc[key] ??= []).push(issue.message);
      return acc;
    }, {});
    return { ok: false, status: 400, errors: fieldErrors };
  }
  const d = parsed.data;
  const { lead, created } = await withOrg(orgId, (tx) =>
    createLeadTx(
      tx,
      orgId,
      {
        firstName: d.nombre,
        lastName: d.apellido,
        phone: d.telefono,
        email: d.email,
        channel: d.canal,
        campaignCode: d.campana,
        developmentName: d.desarrollo,
      },
      {
        source: "WEBHOOK",
        assignTo: "auto",
        consent: { granted: true, ip: meta.ip, userAgent: meta.userAgent?.slice(0, 300) },
        message: d.mensaje,
      },
    ),
  );
  if (created && lead.assignedToId) await notifyLeadAssigned(orgId, lead.id, lead.assignedToId);
  return { ok: true, created, leadId: lead.id };
}
