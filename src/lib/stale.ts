import type { Stage } from "@/generated/prisma/enums";

/** Stages where the lead still needs active follow-up (stale alerts apply). */
export const OPEN_STAGES: Stage[] = ["NUEVO", "CONTACTADO", "CITA_AGENDADA", "VISITA_REALIZADA", "COTIZACION"];

export function isOpenStage(stage: Stage): boolean {
  return OPEN_STAGES.includes(stage);
}

/** Hours since the last contact (or since creation if never contacted). */
export function hoursWithoutContact(
  lead: { lastContactAt: Date | null; createdAt: Date },
  now: Date = new Date(),
): number {
  const ref = lead.lastContactAt ?? lead.createdAt;
  return (now.getTime() - ref.getTime()) / 3_600_000;
}

export function isStale(
  lead: { stage: Stage; lastContactAt: Date | null; createdAt: Date },
  staleLeadHours: number,
  now: Date = new Date(),
): boolean {
  return isOpenStage(lead.stage) && hoursWithoutContact(lead, now) > staleLeadHours;
}

/** Cutoff date: leads whose last touch is before this are stale. */
export function staleCutoff(staleLeadHours: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - staleLeadHours * 3_600_000);
}
