import type { Plan } from "@/generated/prisma/enums";

export type PlanInfo = {
  id: Plan;
  name: string;
  /** Max active users (admins + asesores) including pending invitations. */
  seats: number;
  /** Monthly price in MXN, before IVA. */
  priceMxn: number;
  tagline: string;
  features: string[];
  highlighted?: boolean;
};

export const PLANS: Record<Plan, PlanInfo> = {
  BASICO: {
    id: "BASICO",
    name: "Básico",
    seats: 3,
    priceMxn: 1490,
    tagline: "Para la inmobiliaria que está dejando el Excel.",
    features: [
      "Hasta 3 usuarios",
      "1 desarrollo activo con inventario",
      "Leads ilimitados con campaña de origen",
      "Pipeline kanban y alertas de leads fríos",
      "Dashboard: leads por campaña, costo por lead y ventas por asesor",
      "Formulario web y carga por CSV",
      "WhatsApp Business (Cloud API)",
      "Cotizador en PDF",
    ],
  },
  PROFESIONAL: {
    id: "PROFESIONAL",
    name: "Profesional",
    seats: 10,
    priceMxn: 3490,
    tagline: "Para desarrolladoras con equipo de ventas.",
    features: [
      "Hasta 10 usuarios",
      "Desarrollos ilimitados",
      "Todo lo del plan Básico",
      "Soporte por WhatsApp en horario laboral",
    ],
    highlighted: true,
  },
  DESARROLLADORA: {
    id: "DESARROLLADORA",
    name: "Desarrolladora",
    seats: 25,
    priceMxn: 6990,
    tagline: "Para varias torres, fraccionamientos y equipos.",
    features: [
      "Hasta 25 usuarios",
      "Todo lo del plan Profesional",
      "Acompañamiento para conectar tu número de WhatsApp",
      "Importación asistida de tu base de prospectos",
      "Capacitación al equipo de ventas",
    ],
  },
};

export const PLAN_LIST: PlanInfo[] = [PLANS.BASICO, PLANS.PROFESIONAL, PLANS.DESARROLLADORA];
