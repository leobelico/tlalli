import Link from "next/link";
import type { Metadata } from "next";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireCtx } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { listTasks } from "@/server/services/tasks";
import { toDateTimeLocal } from "@/lib/format";
import { TaskItem, type TaskView } from "./task-item";

export const metadata: Metadata = { title: "Tareas" };

export default async function TasksPage({ searchParams }: PageProps<"/app/tareas">) {
  const { ctx } = await requireCtx();
  const sp = await searchParams;
  const isAdmin = can(ctx.role, "leads:viewAll");
  const scope = isAdmin && sp.equipo === "1" ? "all" : "mine";
  const { tasks, users } = await listTasks(ctx, { scope, includeDone: true });
  const now = new Date();
  const todayMx = toDateTimeLocal(now).slice(0, 10);

  const groups: Record<"overdue" | "today" | "upcoming" | "done", TaskView[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    done: [],
  };
  for (const t of tasks) {
    const view: TaskView = {
      ...t,
      assignee: scope === "all" ? users[t.assignedToId] : undefined,
      lead: { id: t.lead.id, name: [t.lead.firstName, t.lead.lastName].filter(Boolean).join(" ") },
    };
    if (t.completedAt) groups.done.push(view);
    else if (t.dueAt < now) groups.overdue.push(view);
    else if (toDateTimeLocal(t.dueAt).slice(0, 10) === todayMx) groups.today.push(view);
    else groups.upcoming.push(view);
  }

  const sections = [
    { key: "overdue", title: "Vencidas", tone: "text-red-700" },
    { key: "today", title: "Hoy", tone: "" },
    { key: "upcoming", title: "Próximas", tone: "" },
    { key: "done", title: "Completadas (últimos 7 días)", tone: "text-stone-500" },
  ] as const;

  return (
    <>
      <PageHeader
        title="Tareas"
        description="Recordatorios de seguimiento. Créalas desde la ficha de cada lead."
        actions={
          isAdmin ? (
            <div className="flex rounded-lg bg-white p-1 ring-1 ring-stone-200">
              <Link href="/app/tareas" className={`rounded-md px-3 py-1 text-sm ${scope === "mine" ? "bg-brand-600 text-white" : ""}`}>
                Mías
              </Link>
              <Link href="/app/tareas?equipo=1" className={`rounded-md px-3 py-1 text-sm ${scope === "all" ? "bg-brand-600 text-white" : ""}`}>
                Todo el equipo
              </Link>
            </div>
          ) : undefined
        }
      />
      {tasks.length === 0 ? (
        <EmptyState title="No tienes tareas">Agenda una llamada o visita desde la ficha de un lead.</EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {sections.map((s) =>
            groups[s.key].length ? (
              <Card key={s.key}>
                <h2 className={`font-semibold ${s.tone}`}>
                  {s.title} <span className="text-sm font-normal text-stone-500">({groups[s.key].length})</span>
                </h2>
                <ul className="mt-2 divide-y divide-stone-100">
                  {groups[s.key].map((t) => (
                    <TaskItem key={t.id} task={t} now={now} />
                  ))}
                </ul>
              </Card>
            ) : null,
          )}
        </div>
      )}
    </>
  );
}
