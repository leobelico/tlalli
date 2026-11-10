"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseForm, uuidSchema, type ActionState } from "@/lib/validation/common";
import { bulkUnitsSchema, developmentSchema, unitSchema, unitStatusSchema } from "@/lib/validation/inventory";
import { planShapeSchema } from "@/lib/plan-shape";
import { requireCtx } from "@/server/auth/session";
import { runAction } from "@/server/errors";
import {
  bulkCreateUnits,
  createDevelopment,
  createUnit,
  deleteUnit,
  setUnitStatus,
  updateDevelopment,
  updateUnit,
} from "@/server/services/inventory";
import { deletePlan, setUnitShape } from "@/server/services/plans";

export async function createDevelopmentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("developments:write");
  const parsed = parseForm(developmentSchema, formData);
  if (parsed.error) return parsed.error;
  let id = "";
  const res = await runAction(async () => {
    id = (await createDevelopment(ctx, parsed.data)).id;
  });
  if (res.error) return res;
  redirect(`/app/desarrollos/${id}`);
}

export async function updateDevelopmentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("developments:write");
  const parsed = parseForm(
    developmentSchema.extend({ id: uuidSchema, active: z.preprocess((v) => v === "on", z.boolean()) }),
    formData,
  );
  if (parsed.error) return parsed.error;
  const { id, ...data } = parsed.data;
  return runAction(async () => {
    await updateDevelopment(ctx, id, data);
    revalidatePath(`/app/desarrollos/${id}`);
    return { ok: true, message: "Desarrollo actualizado." };
  });
}

export async function createUnitAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("units:write");
  const parsed = parseForm(unitSchema.extend({ developmentId: uuidSchema }), formData);
  if (parsed.error) return parsed.error;
  const { developmentId, ...data } = parsed.data;
  return runAction(async () => {
    await createUnit(ctx, developmentId, data);
    revalidatePath(`/app/desarrollos/${developmentId}`);
    return { ok: true, message: `Unidad ${data.code} agregada.` };
  });
}

export async function bulkUnitsAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("units:write");
  const parsed = parseForm(bulkUnitsSchema.extend({ developmentId: uuidSchema }), formData);
  if (parsed.error) return parsed.error;
  const { developmentId, ...data } = parsed.data;
  return runAction(async () => {
    const count = await bulkCreateUnits(ctx, developmentId, data);
    revalidatePath(`/app/desarrollos/${developmentId}`);
    return { ok: true, message: `${count} unidades creadas (las claves repetidas se omitieron).` };
  });
}

export async function updateUnitAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("units:write");
  const parsed = parseForm(unitSchema.extend({ id: uuidSchema, developmentId: uuidSchema }), formData);
  if (parsed.error) return parsed.error;
  const { id, developmentId, ...data } = parsed.data;
  return runAction(async () => {
    await updateUnit(ctx, id, data);
    revalidatePath(`/app/desarrollos/${developmentId}`);
    return { ok: true, message: "Unidad actualizada." };
  });
}

export async function unitStatusAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("units:write");
  const parsed = parseForm(z.object({ id: uuidSchema, developmentId: uuidSchema, status: unitStatusSchema }), formData);
  if (parsed.error) return parsed.error;
  return runAction(async () => {
    await setUnitStatus(ctx, parsed.data.id, parsed.data.status);
    revalidatePath(`/app/desarrollos/${parsed.data.developmentId}`);
    return { ok: true };
  });
}

export async function deleteUnitAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("units:write");
  const parsed = parseForm(z.object({ id: uuidSchema, developmentId: uuidSchema }), formData);
  if (parsed.error) return parsed.error;
  return runAction(async () => {
    await deleteUnit(ctx, parsed.data.id);
    revalidatePath(`/app/desarrollos/${parsed.data.developmentId}`);
    return { ok: true };
  });
}

export async function setUnitShapeAction(
  developmentId: string,
  unitId: string,
  shape: unknown,
): Promise<ActionState> {
  const { ctx } = await requireCtx("units:write");
  const ids = z.object({ developmentId: uuidSchema, unitId: uuidSchema }).safeParse({ developmentId, unitId });
  if (!ids.success) return { error: "Datos inválidos." };
  const parsed = shape === null ? { success: true as const, data: null } : planShapeSchema.safeParse(shape);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Contorno inválido." };
  return runAction(async () => {
    await setUnitShape(ctx, ids.data.developmentId, ids.data.unitId, parsed.data);
    revalidatePath(`/app/desarrollos/${ids.data.developmentId}`);
    return { ok: true };
  });
}

export async function deletePlanAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("units:write");
  const parsed = parseForm(z.object({ developmentId: uuidSchema }), formData);
  if (parsed.error) return parsed.error;
  return runAction(async () => {
    await deletePlan(ctx, parsed.data.developmentId);
    revalidatePath(`/app/desarrollos/${parsed.data.developmentId}`);
    return { ok: true, message: "Plano eliminado." };
  });
}
