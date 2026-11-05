import { ActionForm, Field, SubmitButton } from "@/components/form";
import { toDateTimeLocal } from "@/lib/format";
import { createTaskAction } from "./actions";

function tomorrowAt10(): Date {
  // 10:00 Mexico City tomorrow
  const today = toDateTimeLocal(new Date()).slice(0, 10);
  const d = new Date(`${today}T10:00:00-06:00`);
  return new Date(d.getTime() + 86_400_000);
}

export function TaskForm({
  leadId,
  agents,
  defaultAssignee,
}: {
  leadId: string;
  agents?: { id: string; name: string }[];
  defaultAssignee?: string | null;
}) {
  return (
    <ActionForm action={createTaskAction} resetOnSuccess className="space-y-3">
      <input type="hidden" name="leadId" value={leadId} />
      <Field label="Tarea" name="title">
        <input id="task-title" name="title" className="input" placeholder="Llamar para confirmar la visita" list="task-presets" />
        <datalist id="task-presets">
          <option value="Llamar para dar seguimiento" />
          <option value="Enviar cotización por WhatsApp" />
          <option value="Confirmar cita de visita" />
          <option value="Pedir documentos para apartado" />
        </datalist>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Cuándo" name="dueAt">
          <input id="task-due" name="dueAt" type="datetime-local" className="input" defaultValue={toDateTimeLocal(tomorrowAt10())} />
        </Field>
        {agents ? (
          <Field label="Responsable" name="assignedToId">
            <select id="task-assignee" name="assignedToId" className="input" defaultValue={defaultAssignee ?? ""}>
              <option value="">Asesor del lead</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
      </div>
      <SubmitButton>Agendar</SubmitButton>
    </ActionForm>
  );
}
