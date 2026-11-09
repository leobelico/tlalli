import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { withOrg } from "@/server/db/tenant";
import { can, leadScope, type Ctx } from "@/server/auth/permissions";
import { DomainError, ForbiddenError, NotFoundError } from "@/server/errors";
import { OPEN_STAGES, hoursWithoutContact, stalePolicy, staleWhere } from "@/lib/stale";
import { requireLead } from "./leads";

export type TaskInput = { title: string; dueAt: Date; assignedToId?: string };

export async function createTask(ctx: Ctx, leadId: string, input: TaskInput) {
  return withOrg(ctx.orgId, async (tx) => {
    const lead = await requireLead(tx, ctx, leadId);
    let assignee = input.assignedToId ?? lead.assignedToId ?? ctx.userId;
    if (!can(ctx.role, "leads:assign") && assignee !== ctx.userId) {
      // Asesores can only create tasks for themselves.
      if (input.assignedToId) throw new ForbiddenError("Solo puedes crear tareas para ti.");
      assignee = ctx.userId;
    }
    const member = await tx.membership.findFirst({ where: { userId: assignee, active: true } });
    if (!member) throw new DomainError("La persona asignada no pertenece a tu equipo.");
    return tx.task.create({
      data: {
        organizationId: ctx.orgId,
        leadId,
        title: input.title,
        dueAt: input.dueAt,
        assignedToId: assignee,
        createdById: ctx.userId,
      },
    });
  });
}

async function requireTask(tx: Prisma.TransactionClient, ctx: Ctx, taskId: string) {
  const where: Prisma.TaskWhereInput = { id: taskId };
  if (!can(ctx.role, "leads:viewAll")) where.assignedToId = ctx.userId;
  const task = await tx.task.findFirst({ where });
  if (!task) throw new NotFoundError("Tarea no encontrada.");
  return task;
}

export async function setTaskDone(ctx: Ctx, taskId: string, done: boolean) {
  return withOrg(ctx.orgId, async (tx) => {
    const task = await requireTask(tx, ctx, taskId);
    return tx.task.update({ where: { id: task.id }, data: { completedAt: done ? new Date() : null } });
  });
}

export async function deleteTask(ctx: Ctx, taskId: string) {
  return withOrg(ctx.orgId, async (tx) => {
    const task = await requireTask(tx, ctx, taskId);
    await tx.task.delete({ where: { id: task.id } });
  });
}

export async function listTasks(ctx: Ctx, opts: { scope: "mine" | "all"; includeDone?: boolean }) {
  return withOrg(ctx.orgId, async (tx) => {
    const where: Prisma.TaskWhereInput = {};
    if (opts.scope === "mine" || !can(ctx.role, "leads:viewAll")) where.assignedToId = ctx.userId;
    if (!opts.includeDone) where.completedAt = null;
    else where.OR = [{ completedAt: null }, { completedAt: { gte: new Date(Date.now() - 7 * 86_400_000) } }];
    const tasks = await tx.task.findMany({
      where,
      include: { lead: { select: { id: true, firstName: true, lastName: true, phone: true } } },
      orderBy: [{ completedAt: { sort: "asc", nulls: "first" } }, { dueAt: "asc" }],
      take: 500,
    });
    const userIds = [...new Set(tasks.map((t) => t.assignedToId))];
    const users = await tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
    return { tasks, users: Object.fromEntries(users.map((u) => [u.id, u.name])) };
  });
}

/** Counts shown as reminders across the app (banner, sidebar, home). */
export async function getAlerts(ctx: Ctx, now: Date = new Date()) {
  return withOrg(ctx.orgId, async (tx) => {
    const org = await tx.organization.findUniqueOrThrow({
      where: { id: ctx.orgId },
      select: { staleLeadHours: true, staleHoursByStage: true },
    });
    const staleFilter = { ...leadScope(ctx), ...staleWhere(stalePolicy(org), now) };
    const endOfDay = new Date(now.getTime() + 24 * 3_600_000);
    const [overdueTasks, dueSoonTasks, staleLeads, unassigned, urgentRows] = await Promise.all([
      tx.task.count({ where: { assignedToId: ctx.userId, completedAt: null, dueAt: { lt: now } } }),
      tx.task.count({ where: { assignedToId: ctx.userId, completedAt: null, dueAt: { gte: now, lt: endOfDay } } }),
      tx.lead.count({ where: staleFilter }),
      can(ctx.role, "leads:assign") ? tx.lead.count({ where: { assignedToId: null, stage: { in: OPEN_STAGES } } }) : 0,
      // "Tus 5 más urgentes": never-contacted first (speed to lead), then the longest without contact.
      tx.lead.findMany({
        where: staleFilter,
        orderBy: [{ lastContactAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
        take: 5,
        select: { id: true, firstName: true, lastName: true, lastContactAt: true, createdAt: true, assignedToId: true },
      }),
    ]);
    const urgent = urgentRows.map((l) => ({
      id: l.id,
      name: [l.firstName, l.lastName].filter(Boolean).join(" "),
      hours: Math.floor(hoursWithoutContact(l, now)),
      assignedToId: l.assignedToId,
    }));
    return { overdueTasks, dueSoonTasks, staleLeads, unassigned, urgent, staleLeadHours: org.staleLeadHours };
  });
}
