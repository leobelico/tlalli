"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { optionalMoney, optionalText, uuidSchema, type ActionState } from "@/lib/validation/common";
import { requireCtx } from "@/server/auth/session";
import { runAction } from "@/server/errors";
import { changeStage } from "@/server/services/pipeline";
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
    await changeStage(ctx, leadId, { stage: stage as (typeof STAGES)[number], ...rest });
    revalidatePath("/app/pipeline");
    revalidatePath(`/app/leads/${leadId}`);
    return { ok: true };
  });
}
