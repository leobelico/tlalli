import Link from "next/link";
import type { Ctx } from "@/server/auth/permissions";
import { getAlerts } from "@/server/services/tasks";

/** Visible reminder on every private page: overdue tasks, stale and unassigned leads. */
export async function AlertsBanner({ ctx }: { ctx: Ctx }) {
  const a = await getAlerts(ctx);
  const items: { href: string; text: string }[] = [];
  if (a.overdueTasks) {
    items.push({ href: "/app/tareas", text: `${a.overdueTasks} ${a.overdueTasks === 1 ? "tarea vencida" : "tareas vencidas"}` });
  }
  if (a.staleLeads) {
    items.push({
      href: "/app/leads?frios=1",
      text: `${a.staleLeads} ${a.staleLeads === 1 ? "lead" : "leads"} sin contacto en más de ${a.staleLeadHours} h`,
    });
  }
  if (a.unassigned) {
    items.push({ href: "/app/leads?asesor=none", text: `${a.unassigned} sin asignar` });
  }
  if (!items.length) return null;
  return (
    <div role="status" className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 sm:px-8">
      <span className="font-semibold">Atención:</span>{" "}
      {items.map((it, i) => (
        <span key={it.href}>
          {i > 0 ? " · " : ""}
          <Link href={it.href} className="underline hover:no-underline">
            {it.text}
          </Link>
        </span>
      ))}
      {a.dueSoonTasks ? <span className="text-red-700"> · {a.dueSoonTasks} para las próximas 24 h</span> : null}
    </div>
  );
}
