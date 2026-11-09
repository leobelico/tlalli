"use client";

import { useActionState } from "react";
import { memberAction } from "./actions";
import { guardNetwork } from "@/lib/safe-action";

export function MemberRowActions({
  id,
  active,
  role,
  isSelf,
  name,
  openLeads,
  heirs,
}: {
  id: string;
  active: boolean;
  role: string;
  isSelf: boolean;
  name: string;
  openLeads: number;
  heirs: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(guardNetwork(memberAction), {});
  if (isSelf) return <span className="text-xs text-stone-400">Tú</span>;
  return (
    <div className="flex flex-wrap items-start justify-end gap-2">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="op" value="role" />
        <input type="hidden" name="role" value={role === "ADMIN" ? "ASESOR" : "ADMIN"} />
        <button className="btn-ghost px-2 py-1 text-xs" disabled={pending}>
          {role === "ADMIN" ? "Hacer asesor" : "Hacer admin"}
        </button>
      </form>
      {active ? (
        // Deactivating always asks who inherits the open leads (QA B17).
        <details className="text-left">
          <summary className="btn-ghost cursor-pointer list-none px-2 py-1 text-xs text-red-700">Desactivar…</summary>
          <form action={action} className="mt-2 w-64 space-y-2 rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="op" value="deactivate" />
            <p className="text-xs text-stone-600">
              {name} dejará de entrar de inmediato.{" "}
              {openLeads ? `Tiene ${openLeads} ${openLeads === 1 ? "lead abierto" : "leads abiertos"} y sus tareas pendientes.` : "No tiene leads abiertos."}
            </p>
            <label className="block text-xs font-medium">
              Pasar sus leads y tareas a
              <select name="reassignTo" className="input mt-1 py-1.5 text-sm" defaultValue="" required>
                <option value="" disabled>
                  Elige a alguien…
                </option>
                {heirs.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
                <option value="none">Dejar sin asignar</option>
              </select>
            </label>
            <button className="btn-primary w-full bg-red-700 py-1.5 text-xs hover:bg-red-800" disabled={pending}>
              Desactivar y reasignar
            </button>
          </form>
        </details>
      ) : (
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="op" value="activate" />
          <button className="btn-ghost px-2 py-1 text-xs" disabled={pending}>
            Reactivar
          </button>
        </form>
      )}
      {state.error ? <span className="w-full text-right text-xs text-red-600">{state.error}</span> : null}
      {state.ok && state.message ? <span className="w-full text-right text-xs text-emerald-700">{state.message}</span> : null}
    </div>
  );
}
