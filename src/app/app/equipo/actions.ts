"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { emailSchema, parseForm, uuidSchema, type ActionState } from "@/lib/validation/common";
import { requireCtx } from "@/server/auth/session";
import {
  createInvitation,
  revokeInvitation,
  setMemberActive,
  setMemberRole,
} from "@/server/auth/invitations";
import { runAction } from "@/server/errors";

const roleSchema = z.enum(["ADMIN", "ASESOR"], { error: "Rol inválido." });

export async function inviteAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("members:manage");
  const parsed = parseForm(z.object({ email: emailSchema, role: roleSchema }), formData);
  if (parsed.error) return parsed.error;
  return runAction(async () => {
    const token = await createInvitation(ctx, parsed.data);
    revalidatePath("/app/equipo");
    const link = `${process.env.APP_URL ?? ""}/invitacion/${token}`;
    return {
      ok: true,
      message: "Invitación creada. Copia el enlace y envíaselo (vence en 7 días; solo se muestra una vez).",
      data: { link },
    };
  });
}

export async function revokeInvitationAction(formData: FormData) {
  const { ctx } = await requireCtx("members:manage");
  const id = uuidSchema.parse(formData.get("id"));
  await revokeInvitation(ctx, id);
  revalidatePath("/app/equipo");
}

export async function memberAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("members:manage");
  const parsed = parseForm(
    z.object({
      id: uuidSchema,
      op: z.enum(["activate", "deactivate", "role"]),
      role: roleSchema.optional(),
    }),
    formData,
  );
  if (parsed.error) return parsed.error;
  const { id, op, role } = parsed.data;
  return runAction(async () => {
    if (op === "role" && role) await setMemberRole(ctx, id, role);
    else await setMemberActive(ctx, id, op === "activate");
    revalidatePath("/app/equipo");
    return { ok: true };
  });
}
