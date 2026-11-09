"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { optionalMoney, optionalText, uuidSchema, type ActionState } from "@/lib/validation/common";
import { requireCtx } from "@/server/auth/session";
import { runAction } from "@/server/errors";
import { changeStageDetailed, undoStageChange } from "@/server/services/pipeline";
import { STAGES } from "@/lib/labels";

const stageChangeSchema = z.object({
  leadId: uuidSchema,
  stage: z.enum(STAGES as [string, ...string[]]),
  lostReason: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z
      .enum(["PRECIO", "UBICACION", "FINANCIAMIENTO", "NO_CONTESTA", "COMPRO_OTRO", "SOLO_CURIOSIDAD", "DATOS_INCORRECTOS", "OTRO"])
      .optional(),
  ),
  lostNote: optionalText(500),
  saleAmount: optionalMoney,
});

export type StageChangePayload = z.input<typeof stageChangeSchema>;

export async function moveStageAction(payload: StageChangePayload): Promise<ActionState> {
  const { ctx } = await requireCtx();
  const parsed = stageChangeSchema.safeParse(payload);
  if (!parsed.success) return { error: "Datos inválidos." };
  const { leadId, stage, ...rest } = parsed.data;
  return runAction(async () => {
    const { eventId } = await changeStageDetailed(ctx, leadId, { stage: stage as (typeof STAGES)[number], ...rest });
    revalidatePath("/app", "layout");
    // The id lets the UI offer "Deshacer" for 10 seconds.
    return { ok: true, data: eventId ? { eventId } : undefined };
  });
}

export async function undoStageAction(eventId: string): Promise<ActionState> {
  const { ctx } = await requireCtx();
  if (!uuidSchema.safeParse(eventId).success) return { error: "Datos inválidos." };
  return runAction(async () => {
    await undoStageChange(ctx, eventId);
    revalidatePath("/app", "layout");
    return { ok: true, message: "Listo, se deshizo el cambio." };
  });
}
