"use client";

import { ActionForm, SubmitButton } from "@/components/form";
import { reassignFilteredAction } from "./actions";

/** "Pasar estos leads a…" for the current filters (QA B17). Closed sales are never moved. */
export function BulkReassign({
  total,
  filters,
  agents,
}: {
  total: number;
  filters: Record<string, string>;
  agents: { id: string; name: string }[];
}) {
  return (
    <details className="card mb-4 p-4">
      <summary className="cursor-pointer text-sm font-medium text-brand-700">Reasignar los leads de esta lista</summary>
      <ActionForm action={reassignFilteredAction} className="mt-3 flex flex-wrap items-end gap-3">
        {Object.entries(filters).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <label className="text-sm">
          <span className="label">
            Pasar los {total} leads abiertos de esta lista a
          </span>
          <select name="to" className="input" defaultValue="" required>
            <option value="" disabled>
              Elige a alguien…
            </option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
            <option value="none">Dejar sin asignar</option>
          </select>
        </label>
        <SubmitButton pendingText="Reasignando…">Reasignar</SubmitButton>
        <p className="w-full text-xs text-stone-500">Los vendidos y perdidos conservan a su asesor. Al nuevo responsable le llega un aviso por correo.</p>
      </ActionForm>
    </details>
  );
}
