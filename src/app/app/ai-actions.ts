"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseForm, uuidSchema, type ActionState } from "@/lib/validation/common";
import { requireCtx } from "@/server/auth/session";
import { runAction } from "@/server/errors";
import { analyzeLead, generateInsights } from "@/server/services/ai";
import { parseRange } from "@/server/services/dashboard";

export async function analyzeLeadAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx();
  const parsed = parseForm(z.object({ leadId: uuidSchema }), formData);
  if (parsed.error) return parsed.error;
  return runAction(async () => {
    const result = await analyzeLead(ctx, parsed.data.leadId);
    revalidatePath("/app/configuracion");
    return { ok: true, data: { result: JSON.stringify(result) } };
  });
}

export async function insightsAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("dashboard:viewAll");
  const range = parseRange(
    typeof formData.get("desde") === "string" ? String(formData.get("desde")) : undefined,
    typeof formData.get("hasta") === "string" ? String(formData.get("hasta")) : undefined,
  );
  return runAction(async () => {
    const result = await generateInsights(ctx, range);
    revalidatePath("/app/configuracion");
    return { ok: true, data: { result: JSON.stringify(result) } };
  });
}
