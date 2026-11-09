"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { optionalMoney, parseForm, uuidSchema, type ActionState } from "@/lib/validation/common";
import { requireCtx } from "@/server/auth/session";
import { runAction } from "@/server/errors";
import { createQuote } from "@/server/services/quotes";

const schema = z.object({
  unitId: uuidSchema,
  leadId: z.preprocess((v) => (v === "" ? undefined : v), uuidSchema.optional()),
  discount: optionalMoney,
  downPaymentPct: z.coerce.number({ error: "Enganche inválido." }).min(0).max(100),
  months: z.coerce.number({ error: "Plazo inválido." }).int().min(0).max(360),
  annualRatePct: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().min(0).max(60).optional()),
});

export async function createQuoteAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("quotes:create");
  const parsed = parseForm(schema, formData);
  if (parsed.error) return parsed.error;
  let id = "";
  const res = await runAction(async () => {
    id = (await createQuote(ctx, parsed.data)).id;
  });
  if (res.error || res.data?.pending) {
    revalidatePath("/app", "layout");
    return res;
  }
  revalidatePath("/app", "layout");
  redirect(`/app/cotizador/${id}`);
}
