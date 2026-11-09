import Link from "next/link";
import type { Ctx } from "@/server/auth/permissions";
import { getAlerts } from "@/server/services/tasks";

const since = (h: number) => (h < 48 ? `${h} h` : `${Math.floor(h / 24)} d`);

/**
 * Visible reminder on every private page. Instead of one huge "2973 leads" number, it names the five
 * most urgent cold leads so the next action is obvious (QA B18); the full list is one click away.
 */
export async function AlertsBanner({ ctx }: { ctx: Ctx }) {
  const a = await getAlerts(ctx);
  const extras: { href: string; text: string }[] = [];
  if (a.overdueTasks) {
    extras.push({ href: "/app/tareas", text: `${a.overdueTasks} ${a.overdueTasks === 1 ? "tarea vencida" : "tareas vencidas"}` });
  }
  if (a.unassigned) extras.push({ href: "/app/leads?asesor=none", text: `${a.unassigned} sin asignar` });
  if (!a.urgent.length && !extras.length) return null;
  return (
    <div role="status" className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 sm:px-8">
      {a.urgent.length ? (
        <p>
          <span className="font-semibold">Contacta primero:</span>{" "}
          {a.urgent.map((u, i) => (
            <span key={u.id}>
              {i > 0 ? " · " : ""}
              <Link href={`/app/leads/${u.id}`} className="underline hover:no-underline">
                {u.name}
              </Link>{" "}
              <span className="text-red-700">({since(u.hours)})</span>
            </span>
          ))}
          {a.staleLeads > a.urgent.length ? (
            <>
              {" "}
              ·{" "}
              <Link href="/app/leads?frios=1" className="font-medium underline hover:no-underline">
                ver los {a.staleLeads} fríos
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      {extras.length || a.dueSoonTasks ? (
        <p className={a.urgent.length ? "mt-0.5" : undefined}>
          {extras.map((it, i) => (
            <span key={it.href}>
              {i > 0 ? " · " : ""}
              <Link href={it.href} className="underline hover:no-underline">
                {it.text}
              </Link>
            </span>
          ))}
          {a.dueSoonTasks ? <span className="text-red-700">{extras.length ? " · " : ""}{a.dueSoonTasks} para las próximas 24 h</span> : null}
        </p>
      ) : null}
    </div>
  );
}
