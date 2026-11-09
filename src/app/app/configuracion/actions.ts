"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { nameSchema, optionalText, parseForm, type ActionState } from "@/lib/validation/common";
import { requireCtx } from "@/server/auth/session";
import { runAction } from "@/server/errors";
import {
  publishPrivacyNotice,
  regenerateLeadFormKey,
  TUNABLE_STAGES,
  updateOrganizationSettings,
  updateStalePolicy,
  updateWhatsAppSettings,
} from "@/server/services/organization";

const settingsSchema = z.object({
  name: nameSchema,
  staleLeadHours: z.coerce
    .number({ error: "Escribe un número de horas." })
    .int({ error: "Usa horas completas." })
    .min(1, { error: "Mínimo 1 hora." })
    .max(720, { error: "Máximo 720 horas (30 días)." }),
  maxAsesorDiscountPct: z.coerce
    .number({ error: "Escribe un porcentaje." })
    .int({ error: "Usa un número entero." })
    .min(0, { error: "Entre 0 y 100." })
    .max(100, { error: "Entre 0 y 100." }),
});

const whatsAppSchema = z.object({
  waPhoneNumberId: optionalText(64).pipe(
    z.string().regex(/^\d+$/, { error: "Solo números (es el identificador que te da WhatsApp)." }).optional(),
  ),
  waDisplayPhone: optionalText(30),
});

export async function settingsAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("org:settings");
  const parsed = parseForm(settingsSchema, formData);
  if (parsed.error) return parsed.error;
  return runAction(async () => {
    await updateOrganizationSettings(ctx, parsed.data);
    revalidatePath("/app", "layout");
    return { ok: true, message: "Configuración guardada." };
  });
}

export async function privacyNoticeAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("org:settings");
  const parsed = parseForm(
    z.object({
      content: z
        .string()
        .trim()
        .min(200, { error: "El aviso parece incompleto (mínimo 200 caracteres)." })
        .max(20_000),
    }),
    formData,
  );
  if (parsed.error) return parsed.error;
  return runAction(async () => {
    const notice = await publishPrivacyNotice(ctx, parsed.data.content);
    revalidatePath("/app/configuracion");
    return { ok: true, message: `Aviso de privacidad publicado (versión ${notice.version}).` };
  });
}

export async function regenerateFormKeyAction() {
  const { ctx } = await requireCtx("org:settings");
  await regenerateLeadFormKey(ctx);
  revalidatePath("/app/configuracion");
}

/** Per-stage "cold lead" thresholds. Empty field = use the default for that stage (QA B18). */
export async function stalePolicyAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("org:settings");
  const byStage: Record<string, number> = {};
  for (const stage of TUNABLE_STAGES) {
    const raw = String(formData.get(stage) ?? "").trim();
    if (!raw) continue;
    const n = Number(raw);
    if (!Number.isInteger(n)) return { error: "Usa horas completas.", fieldErrors: { [stage]: ["Usa horas completas."] } };
    byStage[stage] = n;
  }
  return runAction(async () => {
    await updateStalePolicy(ctx, byStage);
    revalidatePath("/app", "layout");
    return { ok: true, message: "Límites por etapa guardados." };
  });
}

export async function whatsAppSettingsAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("org:settings");
  const parsed = parseForm(whatsAppSchema, formData);
  if (parsed.error) return parsed.error;
  return runAction(async () => {
    await updateWhatsAppSettings(ctx, parsed.data);
    revalidatePath("/app/configuracion");
    return { ok: true, message: "Datos de WhatsApp guardados." };
  });
}
