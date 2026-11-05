"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseForm, uuidSchema, type ActionState } from "@/lib/validation/common";
import { campaignSchema } from "@/lib/validation/leads";
import { requireCtx } from "@/server/auth/session";
import { runAction } from "@/server/errors";
import { createCampaign, updateCampaign } from "@/server/services/campaigns";

export async function createCampaignAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("campaigns:write");
  const parsed = parseForm(campaignSchema, formData);
  if (parsed.error) return parsed.error;
  return runAction(async () => {
    const c = await createCampaign(ctx, parsed.data);
    revalidatePath("/app/campanas");
    return { ok: true, message: `Campaña creada con el código ${c.code}.` };
  });
}

export async function updateCampaignAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("campaigns:write");
  const parsed = parseForm(
    campaignSchema.extend({ id: uuidSchema, active: z.preprocess((v) => v === "on", z.boolean()) }),
    formData,
  );
  if (parsed.error) return parsed.error;
  const { id, ...data } = parsed.data;
  return runAction(async () => {
    await updateCampaign(ctx, id, data);
    revalidatePath("/app/campanas");
    return { ok: true, message: "Campaña actualizada." };
  });
}
