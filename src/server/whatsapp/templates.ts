/**
 * Message templates. Outside the 24-hour customer service window WhatsApp only allows
 * pre-approved templates. Each one must be created with the SAME name, language and body
 * in Meta Business Manager (WhatsApp Manager → Plantillas de mensajes) before using the
 * Cloud API provider. Category: MARKETING or UTILITY according to Meta's rules.
 */
export type TemplateDef = {
  name: string;
  language: string;
  label: string;
  /** Body with {{1}}, {{2}}… placeholders, exactly as approved in Meta. */
  body: string;
  variables: { label: string; source: "leadFirstName" | "development" | "agentName" | "orgName" | "free" }[];
};

export const TEMPLATES: TemplateDef[] = [
  {
    name: "bienvenida_prospecto",
    language: "es_MX",
    label: "Bienvenida a prospecto nuevo",
    body: "Hola {{1}}, gracias por tu interés en {{2}}. Soy {{3}}, tu asesor(a). ¿Te puedo compartir precios, planos y formas de pago por aquí?",
    variables: [
      { label: "Nombre del prospecto", source: "leadFirstName" },
      { label: "Desarrollo", source: "development" },
      { label: "Nombre del asesor", source: "agentName" },
    ],
  },
  {
    name: "seguimiento_prospecto",
    language: "es_MX",
    label: "Seguimiento (lead sin respuesta)",
    body: "Hola {{1}}, te escribe {{2}} de {{3}}. ¿Sigues buscando lote o casa? Con gusto te ayudo a agendar una visita sin compromiso.",
    variables: [
      { label: "Nombre del prospecto", source: "leadFirstName" },
      { label: "Nombre del asesor", source: "agentName" },
      { label: "Inmobiliaria", source: "orgName" },
    ],
  },
  {
    name: "recordatorio_visita",
    language: "es_MX",
    label: "Recordatorio de visita",
    body: "Hola {{1}}, te recordamos tu visita a {{2}} el {{3}}. Responde a este mensaje si necesitas cambiar la hora.",
    variables: [
      { label: "Nombre del prospecto", source: "leadFirstName" },
      { label: "Desarrollo", source: "development" },
      { label: "Fecha y hora", source: "free" },
    ],
  },
  {
    name: "cotizacion_enviada",
    language: "es_MX",
    label: "Aviso de cotización",
    body: "Hola {{1}}, ya tengo lista tu cotización de {{2}}. ¿Te la envío por este medio?",
    variables: [
      { label: "Nombre del prospecto", source: "leadFirstName" },
      { label: "Unidad / desarrollo", source: "development" },
    ],
  },
];

export function findTemplate(name: string): TemplateDef | undefined {
  return TEMPLATES.find((t) => t.name === name);
}

export function renderTemplate(t: TemplateDef, variables: string[]): string {
  return t.body.replace(/\{\{(\d+)\}\}/g, (_, n: string) => variables[Number(n) - 1] ?? "");
}
