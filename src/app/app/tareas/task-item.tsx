import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { deleteTaskAction, toggleTaskAction } from "./actions";

export type TaskView = {
  id: string;
  title: string;
  dueAt: Date;
  completedAt: Date | null;
  assignee?: string;
  lead?: { id: string; name: string };
};

export function TaskItem({ task, now = new Date() }: { task: TaskView; now?: Date }) {
  const overdue = !task.completedAt && task.dueAt < now;
  return (
    <li className="flex items-start gap-3 py-2">
      <form action={toggleTaskAction}>
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="done" value={task.completedAt ? "0" : "1"} />
        <button
          aria-label={task.completedAt ? "Marcar como pendiente" : "Marcar como hecha"}
          className={`mt-0.5 grid size-5 place-items-center rounded border text-xs ${
            task.completedAt ? "border-brand-600 bg-brand-600 text-white" : "border-stone-400 bg-white hover:border-brand-600"
          }`}
        >
          {task.completedAt ? "✓" : ""}
        </button>
      </form>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${task.completedAt ? "text-stone-400 line-through" : ""}`}>{task.title}</p>
        <p className={`text-xs ${overdue ? "font-semibold text-red-600" : "text-stone-500"}`}>
          {overdue ? "Vencida · " : ""}
          {formatDateTime(task.dueAt)}
          {task.lead ? (
            <>
              {" · "}
              <Link href={`/app/leads/${task.lead.id}`} className="text-brand-700 hover:underline">
                {task.lead.name}
              </Link>
            </>
          ) : null}
          {task.assignee ? ` · ${task.assignee}` : ""}
        </p>
      </div>
      <form action={deleteTaskAction}>
        <input type="hidden" name="id" value={task.id} />
        <button className="text-xs text-stone-400 hover:text-red-600" aria-label="Borrar tarea">
          ✕
        </button>
      </form>
    </li>
  );
}
