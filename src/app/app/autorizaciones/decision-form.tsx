"use client";

import { useActionState } from "react";
import { guardNetwork } from "@/lib/safe-action";
import { decideAuthorizationAction } from "./actions";

/** Approve / reject one request, with an optional note the asesor will read. */
export function DecisionForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(guardNetwork(decideAuthorizationAction), {});
  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="id" value={id} />
      <label className="block text-xs font-medium text-stone-600">
        Nota para el asesor (opcional)
        <input name="note" maxLength={500} className="input mt-1" placeholder="Ej. Ofrece 5% y cierra esta semana" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button name="approve" value="1" className="btn-primary" disabled={pending}>
          Autorizar
        </button>
        <button name="approve" value="0" className="btn-secondary" disabled={pending}>
          Rechazar
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.ok && state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
    </form>
  );
}
