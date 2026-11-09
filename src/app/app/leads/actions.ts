"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseForm, uuidSchema, type ActionState } from "@/lib/validation/common";
import { manualLeadSchema, updateLeadSchema } from "@/lib/validation/leads";
import { requireCtx } from "@/server/auth/session";
import { runAction } from "@/server/errors";
import { addActivity, createLeadManual, deleteLead, updateLead } from "@/server/services/leads";
import { importLeadsCsv, MAX_IMPORT_BYTES } from "@/server/services/lead-import";
import { decodeCsvBytes } from "@/lib/csv-encoding";
import { parseLeadFilters } from "@/lib/lead-filters";
import { reassignLeads } from "@/server/services/reassign";

export async function createLeadAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("leads:create");
  const parsed = parseForm(manualLeadSchema, formData);
  if (parsed.error) return parsed.error;
  // `consent` is validated by the schema (must be checked); the service records it.
  const input = { ...parsed.data, consent: undefined };
  let leadId = "";
  let created = true;
  let accessible = true;
  const res = await runAction(async () => {
    const r = await createLeadManual(ctx, input);
    leadId = r.lead.id;
    created = r.created;
    accessible = r.accessible;
  });
  if (res.error) return res;
  if (!accessible) {
    return {
      error:
        "Ese teléfono ya está registrado y lo atiende otro asesor. Anotamos tu intento en el historial del prospecto para que el administrador lo vea.",
    };
  }
  revalidatePath("/app/leads");
  redirect(`/app/leads/${leadId}${created ? "" : "?duplicado=1"}`);
}

export async function updateLeadAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx();
  const parsed = parseForm(updateLeadSchema, formData);
  if (parsed.error) return parsed.error;
  const { id, ...input } = parsed.data;
  return runAction(async () => {
    await updateLead(ctx, id, input);
    revalidatePath(`/app/leads/${id}`);
    return { ok: true, message: "Datos actualizados." };
  });
}

export async function addActivityAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx();
  const parsed = parseForm(
    z.object({
      leadId: uuidSchema,
      type: z.enum(["NOTA", "LLAMADA", "CORREO", "VISITA"]),
      body: z.string().trim().min(1, { error: "Escribe algo." }).max(4000),
    }),
    formData,
  );
  if (parsed.error) return parsed.error;
  return runAction(async () => {
    await addActivity(ctx, parsed.data.leadId, parsed.data.type, parsed.data.body);
    revalidatePath("/app", "layout");
    return { ok: true };
  });
}

export async function deleteLeadAction(formData: FormData) {
  const { ctx } = await requireCtx("leads:delete");
  const id = uuidSchema.parse(formData.get("id"));
  await deleteLead(ctx, id);
  revalidatePath("/app/leads");
  redirect("/app/leads?eliminado=1");
}

export async function importCsvAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("leads:import");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecciona un archivo CSV." };
  if (file.size > MAX_IMPORT_BYTES) return { error: "El archivo pesa más de 2 MB." };
  const parsed = parseForm(
    z.object({
      assign: z.enum(["auto", "me", "none"]),
      campaignId: z.preprocess((v) => (v === "" ? undefined : v), uuidSchema.optional()),
      consent: z.literal("on", { error: "Debes confirmar el consentimiento." }),
    }),
    formData,
  );
  if (parsed.error) return parsed.error;
  return runAction(async () => {
    const text = decodeCsvBytes(new Uint8Array(await file.arrayBuffer()));
    const r = await importLeadsCsv(ctx, text, {
      consentConfirmed: true,
      assign: parsed.data.assign,
      campaignId: parsed.data.campaignId,
    });
    revalidatePath("/app/leads");
    const errorLines = r.errors
      .slice(0, 50)
      .map((e) => `Fila ${e.line}: ${e.message}`)
      .join("\n");
    const warningLines = r.warnings
      .slice(0, 50)
      .map((w) => `Fila ${w.line}: ${w.message}`)
      .join("\n");
    return {
      ok: true,
      message: `Importación terminada: ${r.created} nuevos, ${r.duplicates} ya existían (se registró el nuevo contacto), ${r.errors.length} con errores, ${r.warnings.length} con avisos.`,
      data: {
        errors: [errorLines, warningLines].filter(Boolean).join("\n"),
        unknownHeaders: r.unknownHeaders.join(", "),
      },
    };
  });
}

/** Bulk reassignment of exactly the leads the current list filters show (QA B17). */
export async function reassignFilteredAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx } = await requireCtx("leads:assign");
  const to = String(formData.get("to") ?? "");
  if (to !== "none" && !uuidSchema.safeParse(to).success) return { error: "Elige a quién pasar los leads." };
  const filters = parseLeadFilters(Object.fromEntries(formData));
  return runAction(async () => {
    const { count } = await reassignLeads(ctx, { ...filters, page: undefined }, to === "none" ? null : to);
    revalidatePath("/app/leads");
    return { ok: true, message: count ? `Listo: se reasignaron ${count} leads.` : "No había leads abiertos que mover con esos filtros." };
  });
}
