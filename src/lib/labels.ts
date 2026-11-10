import type { BadgeTone } from "@/components/ui";
import type {
  ActivityType,
  Channel,
  LeadSource,
  LostReason,
  Stage,
  UnitStatus,
  UnitType,
} from "@/generated/prisma/enums";

export const UNIT_TYPE_LABEL: Record<UnitType, string> = {
  LOTE: "Lote",
  CASA: "Casa",
  DEPARTAMENTO: "Departamento",
  LOCAL: "Local comercial",
};

/** Words a unit code may already start with, per type ("Lote 1", "Depto 7", "Lt 5"). */
const TYPE_PREFIXES: Record<UnitType, string[]> = {
  LOTE: ["lote", "lt"],
  CASA: ["casa"],
  DEPARTAMENTO: ["departamento", "depto", "dpto", "depa"],
  LOCAL: ["local"],
};

/** "Lote 1", not "Lote Lote 1": the type is added only when the code does not already say it (QA2 B42). */
export function unitDisplayName(type: UnitType, code: string): string {
  const first = code.trim().split(/[\s.\-_/]+/)[0]?.toLowerCase() ?? "";
  return TYPE_PREFIXES[type].includes(first) ? code.trim() : `${UNIT_TYPE_LABEL[type]} ${code.trim()}`;
}

export const UNIT_STATUS_LABEL: Record<UnitStatus, string> = {
  DISPONIBLE: "Disponible",
  APARTADO: "Apartado",
  VENDIDO: "Vendido",
};

export const UNIT_STATUS_TONE: Record<UnitStatus, BadgeTone> = {
  DISPONIBLE: "green",
  APARTADO: "amber",
  VENDIDO: "gray",
};

export const CHANNEL_LABEL: Record<Channel, string> = {
  RADIO: "Radio",
  ESPECTACULAR: "Espectacular",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  GOOGLE: "Google",
  TIKTOK: "TikTok",
  REFERIDO: "Referido",
  SITIO_WEB: "Sitio web",
  WHATSAPP: "WhatsApp",
  VOLANTE: "Volante",
  EVENTO: "Evento / expo",
  PORTAL: "Portal inmobiliario",
  OTRO: "Otro",
};

export const STAGES: Stage[] = [
  "NUEVO",
  "CONTACTADO",
  "CITA_AGENDADA",
  "VISITA_REALIZADA",
  "COTIZACION",
  "APARTADO",
  "VENDIDO",
  "PERDIDO",
];

export const STAGE_LABEL: Record<Stage, string> = {
  NUEVO: "Nuevo",
  CONTACTADO: "Contactado",
  CITA_AGENDADA: "Cita agendada",
  VISITA_REALIZADA: "Visita realizada",
  COTIZACION: "Cotización",
  APARTADO: "Apartado",
  VENDIDO: "Vendido",
  PERDIDO: "Perdido",
};

export const STAGE_TONE: Record<Stage, BadgeTone> = {
  NUEVO: "blue",
  CONTACTADO: "violet",
  CITA_AGENDADA: "violet",
  VISITA_REALIZADA: "violet",
  COTIZACION: "amber",
  APARTADO: "amber",
  VENDIDO: "green",
  PERDIDO: "red",
};

export const LOST_REASON_LABEL: Record<LostReason, string> = {
  PRECIO: "Precio",
  UBICACION: "Ubicación",
  FINANCIAMIENTO: "No obtuvo financiamiento / crédito",
  NO_CONTESTA: "No contesta",
  COMPRO_OTRO: "Compró en otro lado",
  SOLO_CURIOSIDAD: "Solo pedía información",
  DATOS_INCORRECTOS: "Datos incorrectos",
  OTRO: "Otro",
};

export const SOURCE_LABEL: Record<LeadSource, string> = {
  MANUAL: "Captura manual",
  CSV: "Importación CSV",
  WEBHOOK: "Formulario web",
  WHATSAPP: "WhatsApp entrante",
  SEED: "Datos de prueba",
};

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  NOTA: "Nota",
  LLAMADA: "Llamada",
  WHATSAPP_SALIENTE: "WhatsApp enviado",
  WHATSAPP_ENTRANTE: "WhatsApp recibido",
  CORREO: "Correo",
  VISITA: "Visita",
  CAMBIO_ETAPA: "Cambio de etapa",
  ASIGNACION: "Asignación",
  SISTEMA: "Sistema",
};
