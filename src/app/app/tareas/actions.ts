"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseForm, uuidSchema, type ActionState } from "@/lib/validation/common";
import { parseMxDateTimeLocal } from "@/lib/format";
import { requireCtx } from "@/server/auth/session";
import { runAction } from "@/server/errors";
import { createTask, deleteTask, setTaskDone } from "@/server/services/tasks";

const taskSchema = z.object({
  leadId: uuidSchema,
  title: z.string().trim().min(2, { error: "Describe la tarea." }).max(200),
  dueAt: z.string().transform((v, ctx) => {
    const d = parseMxDateTimeLocal(v);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Fecha inválida." });
      return z.NEVER;
    }
    return d;
  }),
  assignedToId: z.preprocess((v) => (v === "" ? undefined : v), uuidSchema.optional()),
});

export async function createTaskAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx();
  const parsed = parseForm(taskSchema, formData);
  if (parsed.error) return parsed.error;
  const { leadId, ...input } = parsed.data;
  return runAction(async () => {
    await createTask(ctx, leadId, input);
    revalidatePath(`/app/leads/${leadId}`);
    revalidatePath("/app", "layout");
    return { ok: true, message: "Tarea agendada." };
  });
}

export async function toggleTaskAction(formData: FormData) {
  const { ctx } = await requireCtx();
  const id = uuidSchema.parse(formData.get("id"));
  const done = formData.get("done") === "1";
  await setTaskDone(ctx, id, done);
  revalidatePath("/app", "layout");
}

export async function deleteTaskAction(formData: FormData) {
  const { ctx } = await requireCtx();
  const id = uuidSchema.parse(formData.get("id"));
  await deleteTask(ctx, id);
  revalidatePath("/app", "layout");
}
