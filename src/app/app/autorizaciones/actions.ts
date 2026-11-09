"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { optionalText, parseForm, uuidSchema, type ActionState } from "@/lib/validation/common";
import { requireCtx } from "@/server/auth/session";
import { runAction } from "@/server/errors";
import { decideAuthorization } from "@/server/services/authorizations";

export async function decideAuthorizationAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("pricing:override");
  const parsed = parseForm(
    z.object({ id: uuidSchema, approve: z.enum(["1", "0"]), note: optionalText(500) }),
    formData,
  );
  if (parsed.error) return parsed.error;
  const { id, approve, note } = parsed.data;
  return runAction(async () => {
    await decideAuthorization(ctx, id, { approve: approve === "1", note });
    revalidatePath("/app", "layout");
    return { ok: true, message: approve === "1" ? "Autorizada. Se avisó al asesor." : "Rechazada. Se avisó al asesor." };
  });
}
