import "server-only";
import Papa from "papaparse";
import type { Channel } from "@/generated/prisma/enums";
import { withOrg } from "@/server/db/tenant";
import { assertCan, type Ctx } from "@/server/auth/permissions";
import { DomainError } from "@/server/errors";
import { normalizePhone } from "@/lib/phone";
import { CHANNELS } from "@/lib/validation/leads";
import { CHANNEL_LABEL } from "@/lib/labels";
import { createLeadTx, type LeadCreateInput } from "./leads";

export const MAX_IMPORT_ROWS = 2000;
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

const HEADER_ALIASES: Record<string, keyof ParsedRow["data"]> = {
  nombre: "firstName",
  name: "firstName",
  first_name: "firstName",
  nombres: "firstName",
  apellido: "lastName",
  apellidos: "lastName",
  last_name: "lastName",
  telefono: "phone",
  tel: "phone",
  celular: "phone",
  whatsapp: "phone",
  movil: "phone",
  phone: "phone",
  email: "email",
  correo: "email",
  correo_electronico: "email",
  campana: "campaignCode",
  codigo_campana: "campaignCode",
  codigo: "campaignCode",
  campaign: "campaignCode",
  canal: "channel",
  origen: "channel",
  medio: "channel",
  fuente: "channel",
  channel: "channel",
  desarrollo: "developmentName",
  proyecto: "developmentName",
  notas: "notes",
  comentarios: "notes",
  observaciones: "notes",
  presupuesto: "budget",
};

export type ParsedRow = {
  line: number;
  data: {
    firstName: string;
    lastName?: string;
    phone: string;
    email?: string;
    campaignCode?: string;
    channel?: Channel;
    developmentName?: string;
    notes?: string;
    budget?: number;
  };
};

export type RowError = { line: number; message: string };

function normalizeKey(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

const CHANNEL_LOOKUP: Record<string, Channel> = Object.fromEntries([
  ...CHANNELS.map((c) => [normalizeKey(c), c]),
  ...Object.entries(CHANNEL_LABEL).map(([c, label]) => [normalizeKey(label), c as Channel]),
  ["fb", "FACEBOOK"],
  ["face", "FACEBOOK"],
  ["ig", "INSTAGRAM"],
  ["web", "SITIO_WEB"],
  ["pagina_web", "SITIO_WEB"],
  ["referencia", "REFERIDO"],
  ["recomendacion", "REFERIDO"],
  ["anuncio_espectacular", "ESPECTACULAR"],
  ["expo", "EVENTO"],
]);

export function parseChannel(v: string | undefined): Channel | undefined {
  if (!v) return undefined;
  return CHANNEL_LOOKUP[normalizeKey(v)] ?? "OTRO";
}

/** Pure CSV parsing + per-row validation. Accepts comma or semicolon (Excel in es-MX). */
export function parseLeadsCsv(text: string): { rows: ParsedRow[]; errors: RowError[]; unknownHeaders: string[] } {
  const clean = text.replace(/^﻿/, "");
  const result = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => normalizeKey(h),
  });
  const headers = result.meta.fields ?? [];
  const unknownHeaders = headers.filter((h) => !HEADER_ALIASES[h]);
  const mapped = new Set(headers.map((h) => HEADER_ALIASES[h]).filter(Boolean));
  if (!mapped.has("firstName") || !mapped.has("phone")) {
    throw new DomainError('El archivo debe tener al menos las columnas "nombre" y "telefono".');
  }
  if (result.data.length > MAX_IMPORT_ROWS) {
    throw new DomainError(`Máximo ${MAX_IMPORT_ROWS} filas por archivo (tiene ${result.data.length}).`);
  }

  const rows: ParsedRow[] = [];
  const errors: RowError[] = [];
  const seenPhones = new Set<string>();

  result.data.forEach((raw, i) => {
    const line = i + 2; // header is line 1
    const d: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      const field = HEADER_ALIASES[k];
      if (field && typeof v === "string" && v.trim() && d[field] === undefined) d[field] = v.trim();
    }
    if (!d.firstName) return errors.push({ line, message: "Falta el nombre." });
    const phone = normalizePhone(d.phone);
    if (!phone) return errors.push({ line, message: `Teléfono inválido: "${d.phone ?? ""}".` });
    if (seenPhones.has(phone)) return errors.push({ line, message: "Teléfono repetido dentro del archivo." });
    seenPhones.add(phone);
    let email: string | undefined;
    if (d.email) {
      email = d.email.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errors.push({ line, message: `Correo inválido: "${d.email}".` });
    }
    const budget = d.budget ? Number(d.budget.replace(/[$,\s]/g, "")) : undefined;
    rows.push({
      line,
      data: {
        firstName: d.firstName.slice(0, 80),
        lastName: d.lastName?.slice(0, 80),
        phone,
        email,
        campaignCode: d.campaignCode?.slice(0, 30),
        channel: parseChannel(d.channel),
        developmentName: d.developmentName?.slice(0, 120),
        notes: d.notes?.slice(0, 2000),
        budget: budget !== undefined && Number.isFinite(budget) && budget >= 0 ? budget : undefined,
      },
    });
  });
  return { rows, errors, unknownHeaders };
}

export async function importLeadsCsv(
  ctx: Ctx,
  text: string,
  opts: { consentConfirmed: boolean; assign: "auto" | "me" | "none"; campaignId?: string },
) {
  assertCan(ctx, "leads:import");
  if (!opts.consentConfirmed) {
    throw new DomainError(
      "Confirma que los prospectos del archivo aceptaron tu aviso de privacidad (LFPDPPP) antes de importarlos.",
    );
  }
  if (text.length > MAX_IMPORT_BYTES) throw new DomainError("El archivo pesa más de 2 MB.");
  const { rows, errors, unknownHeaders } = parseLeadsCsv(text);
  let created = 0;
  let duplicates = 0;
  const assignTo = opts.assign === "auto" ? "auto" : opts.assign === "me" ? ctx.userId : undefined;

  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    await withOrg(ctx.orgId, async (tx) => {
      for (const row of chunk) {
        const input: LeadCreateInput = { ...row.data };
        if (opts.campaignId && !input.campaignCode) input.campaignId = opts.campaignId;
        const res = await createLeadTx(tx, ctx.orgId, input, {
          source: "CSV",
          actorUserId: ctx.userId,
          assignTo,
          consent: { granted: true },
        });
        if (res.created) created++;
        else duplicates++;
      }
    });
  }
  return { created, duplicates, errors, unknownHeaders, total: rows.length + errors.length };
}
