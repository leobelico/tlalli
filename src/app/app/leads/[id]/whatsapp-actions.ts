"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseForm, uuidSchema, type ActionState } from "@/lib/validation/common";
import { requireCtx } from "@/server/auth/session";
import { runAction } from "@/server/errors";
import { recordConsent } from "@/server/services/leads";
import { sendTemplateToLead, sendTextToLead, simulateInbound } from "@/server/services/whatsapp";

export async function sendTemplateAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx();
  const parsed = parseForm(
    z.object({ leadId: uuidSchema, template: z.string().min(1).max(60), vars: z.array(z.string().max(200)).or(z.string().max(200)).optional() }),
    formData,
  );
  if (parsed.error) return parsed.error;
  const vars = parsed.data.vars === undefined ? [] : Array.isArray(parsed.data.vars) ? parsed.data.vars : [parsed.data.vars];
  return runAction(async () => {
    const r = await sendTemplateToLead(ctx, parsed.data.leadId, parsed.data.template, vars);
    revalidatePath("/app", "layout");
    return r.ok ? { ok: true, message: "Plantilla enviada." } : { error: r.error };
  });
}

export async function sendTextAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx();
  const parsed = parseForm(z.object({ leadId: uuidSchema, body: z.string().trim().min(1, { error: "Escribe un mensaje." }).max(4096) }), formData);
  if (parsed.error) return parsed.error;
  return runAction(async () => {
    const r = await sendTextToLead(ctx, parsed.data.leadId, parsed.data.body);
    revalidatePath("/app", "layout");
    return r.ok ? { ok: true } : { error: r.error };
  });
}

export async function simulateInboundAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx();
  const parsed = parseForm(z.object({ leadId: uuidSchema, body: z.string().trim().min(1).max(1000) }), formData);
  if (parsed.error) return parsed.error;
  return runAction(async () => {
    await simulateInbound(ctx, parsed.data.leadId, parsed.data.body);
    revalidatePath(`/app/leads/${parsed.data.leadId}`);
    return { ok: true };
  });
}

export async function consentAction(formData: FormData) {
  const { ctx } = await requireCtx();
  const leadId = uuidSchema.parse(formData.get("leadId"));
  await recordConsent(ctx, leadId, formData.get("granted") === "1");
  revalidatePath(`/app/leads/${leadId}`);
}
