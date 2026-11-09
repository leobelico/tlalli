import type { Stage } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

/** Stages where the lead still needs active follow-up (stale alerts apply). */
export const OPEN_STAGES: Stage[] = ["NUEVO", "CONTACTADO", "CITA_AGENDADA", "VISITA_REALIZADA", "COTIZACION"];

/**
 * Default hours without contact before a lead counts as "cold", per stage (QA B18). NUEVO uses the
 * organization's base setting (speed-to-lead); later stages naturally go longer between touches.
 */
export const DEFAULT_STAGE_HOURS: Partial<Record<Stage, number>> = {
  CONTACTADO: 72,
  CITA_AGENDADA: 168,
  VISITA_REALIZADA: 72,
  COTIZACION: 120,
};
export const MAX_STALE_HOURS = 720;

export type StalePolicy = { base: number; byStage: Partial<Record<Stage, number>> };

/** Builds the policy from the organization row. Unknown stages or non-numeric values are ignored. */
export function stalePolicy(org: { staleLeadHours: number; staleHoursByStage?: unknown }): StalePolicy {
  const byStage: Partial<Record<Stage, number>> = {};
  const raw = org.staleHoursByStage;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (OPEN_STAGES.includes(k as Stage) && Number.isInteger(v) && (v as number) >= 1 && (v as number) <= MAX_STALE_HOURS) {
        byStage[k as Stage] = v as number;
      }
    }
  }
  return { base: org.staleLeadHours, byStage };
}

export function staleHoursFor(stage: Stage, policy: StalePolicy): number {
  return policy.byStage[stage] ?? (stage === "NUEVO" ? policy.base : (DEFAULT_STAGE_HOURS[stage] ?? policy.base));
}

export function isOpenStage(stage: Stage): boolean {
  return OPEN_STAGES.includes(stage);
}

/** Hours since the last contact (or since creation if never contacted). */
export function hoursWithoutContact(lead: { lastContactAt: Date | null; createdAt: Date }, now: Date = new Date()): number {
  const ref = lead.lastContactAt ?? lead.createdAt;
  return (now.getTime() - ref.getTime()) / 3_600_000;
}

/**
 * A lead is cold when it is open, has no upcoming task/appointment, and has gone longer than its
 * stage threshold without contact. A plain number means "same threshold for every stage".
 */
export function isStale(
  lead: { stage: Stage; lastContactAt: Date | null; createdAt: Date; hasUpcomingTask?: boolean },
  policy: StalePolicy | number,
  now: Date = new Date(),
): boolean {
  if (!isOpenStage(lead.stage) || lead.hasUpcomingTask) return false;
  const limit = typeof policy === "number" ? policy : staleHoursFor(lead.stage, policy);
  return hoursWithoutContact(lead, now) > limit;
}

/** Cutoff date: leads whose last touch is before this are stale. */
export function staleCutoff(staleLeadHours: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - staleLeadHours * 3_600_000);
}

/** Prisma filter equivalent to isStale(): per-stage cutoffs and no pending task due in the future. */
export function staleWhere(policy: StalePolicy, now: Date = new Date()): Prisma.LeadWhereInput {
  return {
    AND: [
      {
        OR: OPEN_STAGES.map((stage) => {
          const cutoff = staleCutoff(staleHoursFor(stage, policy), now);
          return { stage, OR: [{ lastContactAt: { lt: cutoff } }, { lastContactAt: null, createdAt: { lt: cutoff } }] };
        }),
      },
      { tasks: { none: { completedAt: null, dueAt: { gt: now } } } },
    ],
  };
}

/** Prisma `include` fragment to know whether a lead has an upcoming task (for the "Frío" badge). */
export const upcomingTaskInclude = (now: Date = new Date()) =>
  ({ tasks: { where: { completedAt: null, dueAt: { gt: now } }, select: { id: true }, take: 1 } }) as const;
