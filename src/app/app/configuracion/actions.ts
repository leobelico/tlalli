"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { nameSchema, optionalText, parseForm, type ActionState } from "@/lib/validation/common";
import { requireCtx } from "@/server/auth/session";
import { runAction } from "@/server/errors";
import {
  publishPrivacyNotice,
  regenerateLeadFormKey,
  updateOrganizationSettings,
} from "@/server/services/organization";

const settingsSchema = z.object({
  name: nameSchema,
  staleLeadHours: z.coerce
    .number({ error: "Escribe un número de horas." })
    .int({ error: "Usa horas completas." })
    .min(1, { error: "Mínimo 1 hora." })
    .max(720, { error: "Máximo 720 horas (30 días)." }),
  waPhoneNumberId: optionalText(64).pipe(
    z.string().regex(/^\d+$/, { error: "Solo dígitos (lo da Meta)." }).optional(),
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
