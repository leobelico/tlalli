import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { optionalMoney, optionalText } from "./common";

export const CHANNELS = [
  "RADIO",
  "ESPECTACULAR",
  "FACEBOOK",
  "INSTAGRAM",
  "GOOGLE",
  "TIKTOK",
  "REFERIDO",
  "SITIO_WEB",
  "WHATSAPP",
  "VOLANTE",
  "EVENTO",
  "PORTAL",
  "OTRO",
] as const;

export const channelSchema = z.enum(CHANNELS, { error: "Canal inválido." });

export const phoneSchema = z
  .string({ error: "Escribe un teléfono." })
  .trim()
  .max(30)
  .transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Teléfono inválido. Usa 10 dígitos, ej. 444 123 4567." });
      return z.NEVER;
    }
    return n;
  });

const optionalEmail = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().toLowerCase().pipe(z.email({ error: "Correo inválido." })).optional(),
);

const optionalUuid = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.uuid({ error: "Selección inválida." }).optional(),
);

export const campaignCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2, { error: "Mínimo 2 caracteres." })
  .max(30, { error: "Máximo 30 caracteres." })
  .regex(/^[A-Z0-9-]+$/, { error: "Solo letras sin acento, números y guiones." });

export const campaignSchema = z.object({
  name: z.string().trim().min(2, { error: "Escribe un nombre." }).max(120),
  channel: channelSchema,
  code: campaignCodeSchema,
  spend: optionalMoney,
  startDate: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date().optional()),
  endDate: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date().optional()),
  developmentId: optionalUuid,
});

export const leadFieldsSchema = z.object({
  firstName: z.string().trim().min(1, { error: "Escribe el nombre." }).max(80),
  lastName: optionalText(80),
  phone: phoneSchema,
  email: optionalEmail,
  campaignId: optionalUuid,
  channel: channelSchema.optional(),
  developmentId: optionalUuid,
  unitId: optionalUuid,
  budget: optionalMoney,
  notes: optionalText(2000),
});

export const manualLeadSchema = leadFieldsSchema.extend({
  assignedToId: optionalUuid,
  consent: z.literal("on", {
    error: "Confirma que el prospecto aceptó el aviso de privacidad.",
  }),
});

export const updateLeadSchema = leadFieldsSchema.extend({
  id: z.uuid(),
  assignedToId: optionalUuid,
});

const truthy = (v: unknown) =>
  v === true || (typeof v === "string" && ["true", "on", "si", "sí", "1", "yes", "acepto"].includes(v.trim().toLowerCase()));

/** Public webhook payload (Spanish keys for web developers in Mexico; English aliases accepted). */
export const webhookLeadSchema = z
  .object({
    nombre: z.string().trim().min(1, { error: "nombre es obligatorio" }).max(80),
    apellido: optionalText(80),
    telefono: phoneSchema,
    email: optionalEmail,
    campana: optionalText(30),
    canal: z.preprocess((v) => (typeof v === "string" ? v.trim().toUpperCase() : v), channelSchema.optional()),
    desarrollo: optionalText(120),
    mensaje: optionalText(2000),
    acepta_privacidad: z.preprocess(truthy, z.literal(true, { error: "acepta_privacidad debe ser true" })),
    /** Honeypot: real users leave it empty. */
    website: z.string().max(0).optional().or(z.literal("")),
  })
  .strip();

export const WEBHOOK_ALIASES: Record<string, string> = {
  name: "nombre",
  first_name: "nombre",
  last_name: "apellido",
  phone: "telefono",
  teléfono: "telefono",
  celular: "telefono",
  whatsapp: "telefono",
  correo: "email",
  campaign: "campana",
  campaña: "campana",
  codigo_campana: "campana",
  utm_campaign: "campana",
  c: "campana",
  channel: "canal",
  source: "canal",
  development: "desarrollo",
  message: "mensaje",
  comentarios: "mensaje",
  privacy_consent: "acepta_privacidad",
  consent: "acepta_privacidad",
};
